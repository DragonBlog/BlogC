mod dao;
pub mod models;

// src/db.rs

use futures::lock::Mutex;
use rusqlite::{Connection, OpenFlags, Result as SqlResult};
use std::path::Path;
use std::sync::Arc;

pub type DbConnection = Arc<Mutex<Connection>>;

pub fn init_db<P: AsRef<Path>>(db_path: P) -> Result<DbConnection, rusqlite::Error> {
    let flags = OpenFlags::SQLITE_OPEN_READ_WRITE
        | OpenFlags::SQLITE_OPEN_CREATE
        | OpenFlags::SQLITE_OPEN_URI
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;

    let conn = Connection::open_with_flags(db_path, flags)?;

    // 启用 WAL 模式（支持并发读）
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA cache_size = -10000;  -- 10MB
         PRAGMA foreign_keys = ON;",
    )?;

    // 创建表
    create_tables(&conn)?;

    Ok(Arc::new(Mutex::new(conn)))
}

fn create_tables(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            file_type TEXT NOT NULL,
            modify_time INTEGER NOT NULL,
            indexed_at INTEGER NOT NULL,
            hash TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
        CREATE INDEX IF NOT EXISTS idx_files_modify_time ON files(modify_time);
        CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
        CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);

        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (source_id) REFERENCES files(id) ON DELETE CASCADE,
            FOREIGN KEY (target_id) REFERENCES files(id) ON DELETE CASCADE,
            UNIQUE(source_id, target_id)
        );

        CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
        CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
        ",
    )?;

    Ok(())
}

#[cfg(test)]
mod test {
    use super::*;
    use dao::{FileDao, LinkDao};
    use models::{File, Link};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[tokio::test]
    async fn test_file_operations() -> Result<(), Box<dyn std::error::Error>> {
        let conn = init_db(":memory:")?;
        let file_dao = FileDao::new(conn);

        // 测试插入文件
        let file = File {
            id: 0,
            path: "test/file.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: now(),
            hash: "hash123".to_string(),
        };

        let file_id = file_dao.upsert(&file).await?;
        assert!(file_id > 0);

        // 测试根据路径查找文件
        let found_file = file_dao.find_by_path("test/file.md").await?;
        assert!(found_file.is_some());
        let found_file = found_file.unwrap();
        assert_eq!(found_file.path, "test/file.md");
        assert_eq!(found_file.file_type, "note");
        assert_eq!(found_file.hash, "hash123");

        // 测试根据ID查找文件
        let found_file_by_id = file_dao.find_by_id(file_id).await?;
        assert!(found_file_by_id.is_some());
        assert_eq!(found_file_by_id.unwrap().id, file_id);

        // 测试更新文件路径
        file_dao
            .update_path(file_id, "test/updated-file.md", now())
            .await?;
        
        let updated_file = file_dao.find_by_path("test/updated-file.md").await?;
        assert!(updated_file.is_some());
        assert_eq!(updated_file.unwrap().id, file_id);

        // 测试查找不存在的文件
        let non_existent = file_dao.find_by_path("non-existent.md").await?;
        assert!(non_existent.is_none());

        // 测试删除文件
        file_dao.delete_by_id(file_id).await?;
        let deleted_file = file_dao.find_by_id(file_id).await?;
        assert!(deleted_file.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn test_link_operations() -> Result<(), Box<dyn std::error::Error>> {
        let conn = init_db(":memory:")?;
        let file_dao = FileDao::new(conn.clone());
        let link_dao = LinkDao::new(conn);

        // 创建两个测试文件
        let source_file = File {
            id: 0,
            path: "source.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: now(),
            hash: "source_hash".to_string(),
        };

        let target_file = File {
            id: 0,
            path: "target.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: now(),
            hash: "target_hash".to_string(),
        };

        let source_id = file_dao.upsert(&source_file).await?;
        let target_id = file_dao.upsert(&target_file).await?;

        // 测试插入链接
        let link = Link {
            id: 0,
            source_id,
            target_id,
            created_at: now(),
        };

        let link_id = link_dao.insert(&link).await?;
        assert!(link_id > 0);

        // 测试重复插入相同链接（应该幂等）
        let link_id_2 = link_dao.insert(&link).await?;
        assert_eq!(link_id_2, 0); // 0表示重复插入，因为我们的实现中在冲突时返回0

        // 测试查找引用
        let outbound_links = link_dao.find_references_from(source_id).await?;
        assert_eq!(outbound_links.len(), 1);
        assert_eq!(outbound_links[0].target_id, target_id);

        let inbound_links = link_dao.find_references_to(target_id).await?;
        assert_eq!(inbound_links.len(), 1);
        assert_eq!(inbound_links[0].source_id, source_id);

        // 测试删除链接
        link_dao.delete_by_id(link_id).await?;

        let outbound_links_after = link_dao.find_references_from(source_id).await?;
        assert_eq!(outbound_links_after.len(), 0);

        let inbound_links_after = link_dao.find_references_to(target_id).await?;
        assert_eq!(inbound_links_after.len(), 0);

        Ok(())
    }

    #[tokio::test]
    async fn test_cascade_delete() -> Result<(), Box<dyn std::error::Error>> {
        let conn = init_db(":memory:")?;
        let file_dao = FileDao::new(conn.clone());
        let link_dao = LinkDao::new(conn);

        // 创建两个测试文件
        let source_file = File {
            id: 0,
            path: "source.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: now(),
            hash: "source_hash".to_string(),
        };

        let target_file = File {
            id: 0,
            path: "target.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: now(),
            hash: "target_hash".to_string(),
        };

        let source_id = file_dao.upsert(&source_file).await?;
        let target_id = file_dao.upsert(&target_file).await?;

        // 创建链接
        let link = Link {
            id: 0,
            source_id,
            target_id,
            created_at: now(),
        };

        link_dao.insert(&link).await?;

        // 删除源文件，应该级联删除链接
        file_dao.delete_by_id(source_id).await?;

        // 验证链接已被删除
        let outbound_links = link_dao.find_references_from(source_id).await?;
        assert_eq!(outbound_links.len(), 0);

        let inbound_links = link_dao.find_references_to(target_id).await?;
        assert_eq!(inbound_links.len(), 0);

        Ok(())
    }

    #[tokio::test]
    async fn test_batch_operations() -> Result<(), Box<dyn std::error::Error>> {
        let conn = init_db(":memory:")?;
        let file_dao = FileDao::new(conn.clone());
        let link_dao = LinkDao::new(conn);

        // 测试批量插入文件
        let files = vec![
            File {
                id: 0,
                path: "file1.md".to_string(),
                file_type: "note".to_string(),
                modify_time: now(),
                indexed_at: now(),
                hash: "hash1".to_string(),
            },
            File {
                id: 0,
                path: "file2.md".to_string(),
                file_type: "note".to_string(),
                modify_time: now(),
                indexed_at: now(),
                hash: "hash2".to_string(),
            },
        ];

        file_dao.insert_batch(&files).await?;

        // 验证文件已插入
        let all_files = file_dao.list_all().await?;
        assert_eq!(all_files.len(), 2);

        // 测试批量插入链接
        let links = vec![
            Link {
                id: 0,
                source_id: all_files[0].id,
                target_id: all_files[1].id,
                created_at: now(),
            }
        ];

        link_dao.insert_batch(&links).await?;

        // 验证链接已插入
        let outbound_links = link_dao.find_references_from(all_files[0].id).await?;
        assert_eq!(outbound_links.len(), 1);

        Ok(())
    }

    #[test]
    fn test_db_init() -> Result<(), Box<dyn std::error::Error>> {
        let conn = init_db(":memory:")?;
        // 只需验证连接是否成功创建
        assert!(conn.try_lock().is_some());
        Ok(())
    }

    fn now() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
    }
}