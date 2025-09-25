use crate::utils;
use crate::{error::Result, utils::CommandStdout};
use anyhow::anyhow;
use camino::Utf8PathBuf;
use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, AppHandle};
use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    pub exists: bool,
    pub is_empty: bool,
}

/// 检查目录是否存在及是否为空
/// path: 目录路径
#[tauri::command]
pub async fn check_dir(path: Utf8PathBuf) -> Result<CheckResult> {
    Ok(CheckResult {
        exists: utils::check_path_exists(&path),
        is_empty: utils::check_directory_is_empty(&path),
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

#[tauri::command]
pub async fn store_save(app: AppHandle, store_name: &str, current_window: &str) -> Result<()> {
    app.get_store(store_name)
        .ok_or_else(|| anyhow::anyhow!("Store not found: {}", store_name))?
        .save()
        .map_err(|e| anyhow!(e))?;

    for (label, window) in app.webview_windows().iter() {
        if label != current_window {
            window.emit("rehydrate", ()).map_err(|e| anyhow!(e))?;
        }
    }
    Ok(())
}
