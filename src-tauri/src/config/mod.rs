use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlogBuildConfig {
    pub public_dir: String,
    pub entries: HashMap<String, EntryItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryItem {
    pub title: String,
    pub description: String,
    pub entry_base: String,
}
