use crate::utils;
use crate::{error::Result, utils::CommandStdout};
use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, AppHandle};
use tauri_plugin_shell::ShellExt;

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
pub async fn get_command_path(command: &str) -> Result<String> {
    let path = which::which_global(command)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn exec(
    app: AppHandle,
    command: &str,
    sidecar: bool,
    args: Vec<String>,
    cwd: Option<String>,
    on_start: Channel<u32>,
    on_output: Channel<CommandStdout>,
) -> Result<()> {
    utils::exec(
        app.shell(),
        command,
        sidecar,
        args,
        cwd.as_deref(),
        on_output,
        on_start,
    )
    .await
}
