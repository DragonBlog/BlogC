use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

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

#[tauri::command]
pub async fn check_command_exists(command: &str) -> Result<bool> {
    utils::check_command_exists(command).await
}

#[tauri::command]
pub async fn execute_command(
    command: &str,
    args: Vec<String>,
    path: &str,
    on_output: Channel<utils::CommandStdout>,
    on_start: Channel<u32>,
) -> Result<()> {
    utils::execute_command(command, &args, path, on_output, on_start).await
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<()> {
    utils::kill_process(pid).await
}
