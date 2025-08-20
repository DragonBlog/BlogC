use std::env;
use std::path::PathBuf;

use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, error};

use crate::error::Result;
use crate::utils::{self, CommandStdout};

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
    Ok(which::which_global(command).is_ok())
}

#[tauri::command]
pub async fn execute_command(
    app: AppHandle,
    command: &str,
    args: Vec<String>,
    current_dir: Option<String>,
    on_output: Channel<utils::CommandStdout>,
    on_start: Channel<u32>,
) -> Result<()> {
    let path = current_dir
        .map(|p| PathBuf::from(p))
        .unwrap_or(app.path().home_dir()?);

    utils::execute_command(app.shell(), command, &args, path, on_output, on_start).await
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<()> {
    utils::kill_process(pid).await
}

#[tauri::command]
pub async fn install_node(
    app: tauri::AppHandle,
    on_output: Channel<utils::CommandStdout>,
    on_start: Channel<u32>,
) -> Result<()> {
    let dir = env::temp_dir();

    // 安装Node.js https://nodejs.org/en/download
    let (mut rx, child) = app
        .shell()
        .sidecar("fnm")?
        .args(["install", "24"])
        .current_dir(&dir)
        .spawn()?;

    on_start.send(child.pid())?;

    while let Some(output) = rx.recv().await {
        match output {
            CommandEvent::Stdout(bytes) => {
                debug!("stdout: {}", String::from_utf8_lossy(&bytes));
                on_output.send(CommandStdout {
                    log: String::from_utf8_lossy(&bytes).to_string(),
                    is_error: false,
                })?;
            }
            CommandEvent::Stderr(bytes) => {
                debug!("stderr: {}", String::from_utf8_lossy(&bytes));
                on_output.send(CommandStdout {
                    log: String::from_utf8_lossy(&bytes).to_string(),
                    is_error: true,
                })?;
            }
            CommandEvent::Terminated(status) => {
                debug!("Process exited with: {:?}", status);
            }
            CommandEvent::Error(error) => {
                error!("Error: {}", error);
                return Err(anyhow!(error).into());
            }
            _ => {}
        }
    }
    Ok(())
}
