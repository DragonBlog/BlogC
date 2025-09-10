#[derive(Debug, Clone, PartialEq)]
pub struct File {
    pub id: i64,
    pub path: String,
    pub file_type: String, // 建议未来改用 enum，但 String 也可
    pub modify_time: i64,
    pub indexed_at: i64,
    pub hash: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Link {
    pub id: i64,
    pub source_id: i64,
    pub target_id: i64,
    pub created_at: i64,
}
