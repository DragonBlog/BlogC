use crate::error::Result;
use anyhow::anyhow;
use glob::Pattern;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{collections::HashMap, path::Path};
use tokio::{
    fs::{self, File},
    io::AsyncReadExt,
};

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

pub async fn file_front_hash<P: AsRef<Path>>(path: P) -> anyhow::Result<[u8; 32]> {
    let file = File::open(path).await?;

    let mut reader = tokio::io::BufReader::new(file);
    let mut buffer = [0u8; 1024];
    let n = reader.read(&mut buffer).await?;

    let mut hasher = Sha256::new();
    hasher.update(&buffer[..n]);
    let result = hasher.finalize();

    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);

    Ok(hash)
}

pub async fn file_full_hash<P: AsRef<Path>>(path: P) -> anyhow::Result<[u8; 32]> {
    let file = fs::read(path).await?;

    let result = Sha256::digest(file);

    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);

    Ok(hash)
}

pub async fn quick_check_file_changed<P: AsRef<Path>>(
    path: P,
    hash: [u8; 32],
) -> Result<(bool, [u8; 32])> {
    let file_hash = file_front_hash(&path).await?;
    if hash == file_hash {
        let full_hash = file_full_hash(&path).await?;
        if hash == full_hash {
            Ok((false, file_hash))
        } else {
            Ok((true, full_hash))
        }
    } else {
        Ok((true, file_hash))
    }
}
