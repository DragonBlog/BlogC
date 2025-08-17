use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::utils;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    pub exists: bool,
    pub is_empty: bool,
}

/// 检查目录是否存在及是否为空
/// path: 目录路径
#[tauri::command]
pub async fn check_dir(path: &str) -> Result<CheckResult> {
    Ok(CheckResult {
        exists: utils::check_path_exists(path),
        is_empty: utils::check_directory_is_empty(path),
    })
}
