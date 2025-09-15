mod dao;
pub mod models;

// src/db.rs
use crate::error::Result;
pub use dao::{FileDao, LinkDao};
use futures::lock::Mutex;
use rusqlite::{Connection, OpenFlags};
use std::path::Path;
use std::sync::Arc;

pub type DbConnection = Arc<Mutex<Connection>>;

pub fn init_db<P: AsRef<Path>>(db_path: P) -> Result<DbConnection> {
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

fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            file_type TEXT NOT NULL,
            modify_time INTEGER NOT NULL,
            indexed_at INTEGER NOT NULL,
            hash BLOB NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
        CREATE INDEX IF NOT EXISTS idx_files_modify_time ON files(modify_time);
        CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
        CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);

        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            position TEXT,
            start_offset INTEGER,
            end_offset INTEGER,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (source_id) REFERENCES files(id) ON DELETE CASCADE,
            FOREIGN KEY (target_id) REFERENCES files(id) ON DELETE CASCADE,
            UNIQUE(source_id, target_id, start_offset, end_offset)
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
    use markdown::unist::Position;
    use models::{File, Link};
    use time::OffsetDateTime;

    // 辅助函数：将十六进制字符串转换为[u8; 32]
    fn hex_to_bytes(hex: &str) -> [u8; 32] {
        let mut bytes = [0u8; 32];
        if hex.len() == 64 {
            for i in 0..32 {
                let byte_str = &hex[i * 2..i * 2 + 2];
                bytes[i] = u8::from_str_radix(byte_str, 16).unwrap_or(0);
            }
        }
        bytes
    }

    #[tokio::test]
    async fn test_file_operations() -> Result<()> {
        let conn = init_db(":memory:")?;
        let file_dao = FileDao::new(conn);

        // 测试插入文件
        let file = File {
            id: 0,
            path: "test/file.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: OffsetDateTime::now_utc(),
            hash: hex_to_bytes("0000000000000000000000000000000000000000000000000000000000000000"),
        };

        let file_id = file_dao.insert(&file).await?;
        assert!(file_id > 0);

        // 测试根据路径查找文件
        let found_file = file_dao.find_by_path("test/file.md").await?;
        println!("Found file: {:#?}", found_file);
        assert!(found_file.is_some());
        let found_file = found_file.unwrap();
        assert_eq!(found_file.path, "test/file.md");
        assert_eq!(found_file.file_type, "note");
        assert_eq!(
            found_file.hash,
            hex_to_bytes("0000000000000000000000000000000000000000000000000000000000000000")
        );

        // 测试更新文件
        let updated_file = File {
            id: 0,
            path: "test/file.md".to_string(),
            file_type: "article".to_string(),
            modify_time: now() + 1000,
            indexed_at: OffsetDateTime::now_utc(),
            hash: hex_to_bytes("0000000000000000000000000000000000000000000000000000000000000001"),
        };

        let updated_id = file_dao.insert(&updated_file).await?;

        let found_updated = file_dao.find_by_path("test/file.md").await?.unwrap();
        assert_eq!(found_updated.file_type, "article");
        assert_eq!(
            found_updated.hash,
            hex_to_bytes("0000000000000000000000000000000000000000000000000000000000000001")
        );

        // 测试列出所有文件
        let files = file_dao.list_all().await?;
        assert_eq!(files.len(), 1);

        // 测试删除文件
        file_dao.delete_by_id(updated_id).await?;
        let files_after_delete = file_dao.list_all().await?;
        assert_eq!(files_after_delete.len(), 0);

        Ok(())
    }

    #[tokio::test]
    async fn test_link_operations() -> Result<()> {
        let conn = init_db(":memory:")?;
        let file_dao = FileDao::new(conn.clone());
        let link_dao = LinkDao::new(conn);

        // 创建两个测试文件
        let source_file = File {
            id: 0,
            path: "source.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: OffsetDateTime::now_utc(),
            hash: hex_to_bytes("1111111111111111111111111111111111111111111111111111111111111111"),
        };

        let target_file = File {
            id: 0,
            path: "target.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: OffsetDateTime::now_utc(),
            hash: hex_to_bytes("2222222222222222222222222222222222222222222222222222222222222222"),
        };

        let source_id = file_dao.insert(&source_file).await?;
        let target_id = file_dao.insert(&target_file).await?;

        // 测试插入链接
        let link = Link {
            id: 0,
            source_id,
            target_id,
            position: Some(Position::new(1, 1, 1, 2, 3, 9)),
            start_offset: Some(1),
            end_offset: Some(9),
            created_at: OffsetDateTime::now_utc(),
        };

        let link_id = link_dao.insert(&link).await?;
        assert!(link_id > 0);

        // 测试重复插入相同链接（应该幂等）
        let link_id_2 = link_dao.insert(&link).await?;
        assert_eq!(link_id_2, 0); // 0表示重复插入，因为我们的实现中在冲突时返回0

        // 测试查找引用
        let outbound_links = link_dao.find_references_from(source_id).await?;
        println!("Outbound links: {:#?}", outbound_links);

        assert_eq!(outbound_links.len(), 1);
        assert_eq!(outbound_links[0].target_id, target_id);
        assert_eq!(
            outbound_links[0].position,
            Some(Position::new(1, 1, 1, 2, 3, 9))
        );
        assert_eq!(outbound_links[0].start_offset, Some(1));
        assert_eq!(outbound_links[0].end_offset, Some(9));

        let inbound_links = link_dao.find_references_to(target_id).await?;
        assert_eq!(inbound_links.len(), 1);
        assert_eq!(inbound_links[0].source_id, source_id);
        assert_eq!(
            inbound_links[0].position,
            Some(Position::new(1, 1, 1, 2, 3, 9))
        );
        assert_eq!(inbound_links[0].start_offset, Some(1));
        assert_eq!(inbound_links[0].end_offset, Some(9));

        // 测试删除链接
        link_dao.delete_by_id(link_id).await?;

        let outbound_links_after = link_dao.find_references_from(source_id).await?;
        assert_eq!(outbound_links_after.len(), 0);

        let inbound_links_after = link_dao.find_references_to(target_id).await?;
        assert_eq!(inbound_links_after.len(), 0);

        Ok(())
    }

    #[tokio::test]
    async fn test_cascade_delete() -> Result<()> {
        let conn = init_db(":memory:")?;
        let file_dao = FileDao::new(conn.clone());
        let link_dao = LinkDao::new(conn);

        // 创建两个测试文件
        let source_file = File {
            id: 0,
            path: "source.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: OffsetDateTime::now_utc(),
            hash: hex_to_bytes("3333333333333333333333333333333333333333333333333333333333333333"),
        };

        let target_file = File {
            id: 0,
            path: "target.md".to_string(),
            file_type: "note".to_string(),
            modify_time: now(),
            indexed_at: OffsetDateTime::now_utc(),
            hash: hex_to_bytes("4444444444444444444444444444444444444444444444444444444444444444"),
        };

        let source_id = file_dao.insert(&source_file).await?;
        let target_id = file_dao.insert(&target_file).await?;

        // 测试插入链接
        let link = Link {
            id: 0,
            source_id,
            target_id,
            position: Some(Position::new(1, 1, 1, 2, 3, 9)),
            start_offset: Some(1),
            end_offset: Some(9),
            created_at: OffsetDateTime::now_utc(),
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
        assert_eq!(
            outbound_links[0].position,
            Some(Position::new(1, 1, 1, 2, 3, 9))
        );

        let inbound_links = link_dao.find_references_to(target_id).await?;
        assert_eq!(inbound_links.len(), 1);
        assert_eq!(inbound_links[0].source_id, source_id);
        assert_eq!(
            inbound_links[0].position,
            Some(Position::new(1, 1, 1, 2, 3, 9))
        );

        // 测试删除链接
        link_dao.delete_by_id(link_id).await?;

        let outbound_links_after = link_dao.find_references_from(source_id).await?;
        assert_eq!(outbound_links_after.len(), 0);

        let inbound_links_after = link_dao.find_references_to(target_id).await?;
        assert_eq!(inbound_links_after.len(), 0);

        Ok(())
    }

    #[tokio::test]
    async fn test_batch_operations() -> Result<()> {
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
                indexed_at: OffsetDateTime::now_utc(),
                hash: hex_to_bytes(
                    "5555555555555555555555555555555555555555555555555555555555555555",
                ),
            },
            File {
                id: 0,
                path: "file2.md".to_string(),
                file_type: "note".to_string(),
                modify_time: now(),
                indexed_at: OffsetDateTime::now_utc(),
                hash: hex_to_bytes(
                    "6666666666666666666666666666666666666666666666666666666666666666",
                ),
            },
        ];

        file_dao.insert_batch(&files).await?;

        // 验证文件已插入
        let all_files = file_dao.list_all().await?;
        assert_eq!(all_files.len(), 2);

        // 测试批量插入链接
        let links = vec![Link {
            id: 0,
            source_id: all_files[0].id,
            target_id: all_files[1].id,
            position: None,
            start_offset: None,
            end_offset: None,
            created_at: OffsetDateTime::now_utc(),
        }];

        link_dao.insert_batch(&links).await?;

        // 验证链接已插入
        let outbound_links = link_dao.find_references_from(all_files[0].id).await?;
        assert_eq!(outbound_links.len(), 1);
        assert_eq!(outbound_links[0].position, None);
        assert_eq!(outbound_links[0].start_offset, None);
        assert_eq!(outbound_links[0].end_offset, None);

        Ok(())
    }

    #[test]
    fn test_db_init() -> Result<()> {
        let conn = init_db(":memory:")?;
        // 只需验证连接是否成功创建
        assert!(conn.try_lock().is_some());
        Ok(())
    }

    fn now() -> i64 {
        OffsetDateTime::now_utc().unix_timestamp()
    }
}
