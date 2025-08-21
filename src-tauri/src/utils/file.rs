use crate::error::Result;
use anyhow::anyhow;
use glob::Pattern;
use serde_json::Value;
use std::{collections::HashMap, path::Path};
use tokio::fs;

pub fn check_path_exists<P: AsRef<Path>>(path: P) -> bool {
    path.as_ref().exists()
}

pub fn check_directory_is_empty<P: AsRef<Path>>(path: P) -> bool {
    if let Ok(entries) = std::fs::read_dir(path) {
        entries.count() == 0
    } else {
        false
    }
}

pub async fn read_schema_file<P: AsRef<Path>>(path: P) -> Result<HashMap<String, Value>> {
    let mut dir = fs::read_dir(path).await?;
    let mut schemas = HashMap::new();
    let pattern = Pattern::new("*.schema.json")?;

    while let Some(entry) = dir.next_entry().await? {
        let path = entry.path();
        if pattern.matches_path(&path) {
            let name = path
                .file_name()
                .and_then(|s| s.to_os_string().into_string().ok())
                .map(|s| s.replace("schema.json", ""))
                .ok_or(anyhow!("Invalid file name"))?
                .to_string();

            let content = fs::read_to_string(path).await?;
            let json: Value = serde_json::from_str(&content)?;
            schemas.insert(name, json);
        }
    }

    Ok(schemas)
}
