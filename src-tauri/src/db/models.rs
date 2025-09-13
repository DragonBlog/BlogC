use markdown::unist::Position;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct File {
    pub id: i64,
    pub path: String,
    pub file_type: String, // 建议未来改用 enum，但 String 也可
    pub modify_time: i64,
    pub indexed_at: OffsetDateTime,
    pub hash: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Link {
    pub id: i64,
    pub source_id: i64,
    pub target_id: i64,
    pub position: Option<Position>,
    pub start_offset: Option<usize>,
    pub end_offset: Option<usize>,
    pub created_at: OffsetDateTime,
}