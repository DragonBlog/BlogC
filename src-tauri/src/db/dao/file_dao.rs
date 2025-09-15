use crate::db::{models::File, DbConnection};
use rusqlite::{params, Result as SqlResult, Row};

pub struct FileDao {
    conn: DbConnection,
}

impl FileDao {
    pub fn new(conn: DbConnection) -> Self {
        Self { conn }
    }

    // ✅ 插入或替换文件（用于索引更新）
    pub async fn insert(&self, file: &File) -> SqlResult<i64> {
        let conn = self.conn.lock().await;
        conn.execute(
            "INSERT OR REPLACE INTO files (path, file_type, modify_time, indexed_at, hash)
             VALUES (?, ?, ?, ?, ?)",
            params![
                file.path,
                file.file_type,
                file.modify_time,
                file.indexed_at,
                file.hash
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    // ✅ 根据 path 查询文件
    pub async fn find_by_path(&self, path: &str) -> SqlResult<Option<File>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare_cached(
            "SELECT id, path, file_type, modify_time, indexed_at, hash FROM files WHERE path = ?1",
        )?;
        let file_iter = stmt.query_map(params![path], |row| self.map_row(row))?;
        let file = file_iter.collect::<SqlResult<Vec<_>>>()?.pop();
        Ok(file)
    }

    // ✅ 根据 id 查询
    pub async fn find_by_id(&self, id: i64) -> SqlResult<Option<File>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare_cached(
            "SELECT id, path, file_type, modify_time, indexed_at, hash FROM files WHERE id = ?1",
        )?;
        let file_iter = stmt.query_map(params![id], |row| self.map_row(row))?;
        let file = file_iter.collect::<SqlResult<Vec<_>>>()?.pop();
        Ok(file)
    }

    // ✅ 批量插入（用于初始化）
    pub async fn insert_batch(&self, files: &[File]) -> SqlResult<()> {
        let mut conn = self.conn.lock().await;
        let tx = conn.transaction()?;
        {
            let mut stmt = tx.prepare_cached(
                "INSERT INTO files (path, file_type, modify_time, indexed_at, hash)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
            )?;
            for file in files {
                stmt.execute(params![
                    file.path,
                    file.file_type,
                    file.modify_time,
                    file.indexed_at,
                    file.hash
                ])?;
            }
        }
        tx.commit()?;
        Ok(())
    }

    // ✅ 更新文件路径（重命名核心操作）
    pub async fn update_path(&self, id: i64, new_path: &str, new_mtime: i64) -> SqlResult<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "UPDATE files SET path = ?1, modify_time = ?2, indexed_at = ?3 WHERE id = ?4",
            params![new_path, new_mtime, new_mtime, id],
        )?;
        Ok(())
    }

    // ✅ 删除文件（自动级联删除 links）
    pub async fn delete_by_id(&self, id: i64) -> SqlResult<()> {
        let conn = self.conn.lock().await;
        conn.execute("DELETE FROM files WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ✅ 查询所有文件（用于扫描）
    pub async fn list_all(&self) -> SqlResult<Vec<File>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare_cached(
            "SELECT id, path, file_type, modify_time, indexed_at, hash FROM files",
        )?;
        let files = stmt
            .query_map(params![], |row| self.map_row(row))?
            .collect::<SqlResult<Vec<_>>>()?;
        Ok(files)
    }

    // ✅ 辅助函数：从 Row 映射到 File
    fn map_row(&self, row: &Row) -> SqlResult<File> {
        Ok(File {
            id: row.get(0)?,
            path: row.get(1)?,
            file_type: row.get(2)?,
            modify_time: row.get(3)?,
            indexed_at: row.get(4)?,
            hash: row.get(5)?,
        })
    }
}
