use crate::db::{models::Link, DbConnection};
use crate::error::Result;
use rusqlite::{params, Result as SqlResult, Row};
use serde_json;

pub struct LinkDao {
    conn: DbConnection,
}

impl LinkDao {
    pub fn new(conn: DbConnection) -> Self {
        Self { conn }
    }

    // ✅ 插入链接（自动去重）
    pub async fn insert(&self, link: &Link) -> Result<i64> {
        let conn = self.conn.lock().await;
        let position_json = serde_json::to_value(&link.position)?;

        match conn.execute(
            "INSERT INTO links (source_id, target_id, position, start_offset, end_offset, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![link.source_id, link.target_id, position_json, link.start_offset, link.end_offset, link.created_at],
        ) {
            Ok(_) => Ok(conn.last_insert_rowid()),
            Err(rusqlite::Error::SqliteFailure(e, _))
                if e.code == rusqlite::ErrorCode::ConstraintViolation =>
            {
                // UNIQUE 冲突，视为成功（幂等）
                Ok(0)
            }
            Err(e) => Err(e.into()),
        }
    }

    // ✅ 批量插入（用于重建索引）
    pub async fn insert_batch(&self, links: &[Link]) -> Result<()> {
        let mut conn = self.conn.lock().await;
        let tx = conn.transaction()?;
        {
            let mut stmt = tx.prepare_cached(
                "INSERT OR IGNORE INTO links (source_id, target_id, position, start_offset, end_offset, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )?;
            for link in links {
                let position_json = serde_json::to_value(&link.position)?;

                stmt.execute(params![
                    link.source_id,
                    link.target_id,
                    position_json,
                    link.start_offset,
                    link.end_offset,
                    link.created_at
                ])?;
            }
        }
        tx.commit()?;
        Ok(())
    }

    // ✅ 查询某个文件被谁引用（反向链接）
    pub async fn find_references_to(&self, target_id: i64) -> Result<Vec<Link>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare_cached(
            "SELECT id, source_id, target_id, position, start_offset, end_offset, created_at FROM links WHERE target_id = ?1",
        )?;
        let links = stmt
            .query_map(params![target_id], |row| self.map_row(row))?
            .collect::<SqlResult<Vec<_>>>()?;
        Ok(links)
    }

    // ✅ 查询某个文件引用了谁
    pub async fn find_references_from(&self, source_id: i64) -> Result<Vec<Link>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare_cached(
            "SELECT id, source_id, target_id, position, start_offset, end_offset, created_at FROM links WHERE source_id = ?1",
        )?;
        let links = stmt
            .query_map(params![source_id], |row| self.map_row(row))?
            .collect::<SqlResult<Vec<_>>>()?;
        Ok(links)
    }

    // ✅ 删除某个文件的所有出站链接
    pub async fn delete_by_source_id(&self, source_id: i64) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute("DELETE FROM links WHERE source_id = ?1", params![source_id])?;
        Ok(())
    }

    // ✅ 删除某个文件的所有入站链接
    pub async fn delete_by_target_id(&self, target_id: i64) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute("DELETE FROM links WHERE target_id = ?1", params![target_id])?;
        Ok(())
    }

    // ✅ 删除单个链接
    pub async fn delete_by_id(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute("DELETE FROM links WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ✅ 辅助函数：从 Row 映射到 Link
    fn map_row(&self, row: &Row) -> SqlResult<Link> {
        let value: serde_json::Value = row.get(3)?;
        Ok(Link {
            id: row.get(0)?,
            source_id: row.get(1)?,
            target_id: row.get(2)?,
            position: serde_json::from_value(value).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?,
            start_offset: row.get(4)?,
            end_offset: row.get(5)?,
            created_at: row.get(6)?,
        })
    }
}
