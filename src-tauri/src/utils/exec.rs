use crate::error::Result;
use anyhow::anyhow;
use serde::Serialize;
use std::{ffi::OsStr, path::Path};
use tauri::{ipc::Channel, Runtime};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::Shell;
use tokio::process::Command;
use tracing::{debug, error, trace};
use which::which_global;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandStdout {
    /// 命令执行的输出内容
    pub log: String,
    /// 标识该行输出是否为错误信息
    pub is_error: bool,
}

/// 执行系统命令并实时返回输出结果
///
/// 该函数使用 tokio 异步执行指定的系统命令，并通过 Channel 实时返回命令的标准输出和错误输出。
/// 函数会同时处理 stdout 和 stderr，并在前端区分显示。
///
/// # 参数
/// * `command` - 要执行的命令名称
/// * `args` - 命令的参数列表
/// * `dir` - 命令执行的工作目录
/// * `on_output` - 用于发送命令输出的 Channel
///
/// # 返回值
/// 返回 Result<u32> 类型，成功时返回进程ID，失败时返回相应的错误信息
///
/// # 工作原理
/// 1. 创建子进程执行命令，重定向 stdout 和 stderr
/// 2. 使用 tokio::select! 同时监听 stdout、stderr 和进程完成事件
/// 3. 实时将输出通过 Channel 发送到前端
/// 4. 当子进程完成时退出循环，此时所有输出都已经处理完毕
pub async fn execute_command<I, S, P, R: Runtime>(
    shell: &Shell<R>,
    command: &str,
    args: I,
    dir: P,
    on_output: Channel<CommandStdout>,
    on_start: Channel<u32>,
) -> Result<()>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
    P: AsRef<Path>,
{
    let command_path = which_global(command)?;

    let (mut rx, child) = shell
        .command(command_path)
        .args(args)
        .current_dir(dir)
        .spawn()?;

    on_start.send(child.pid())?;

    while let Some(output) = rx.recv().await {
        match output {
            CommandEvent::Stdout(buf) => {
                let log = String::from_utf8_lossy(&buf).to_string();
                trace!("stdout: {}", log);
                on_output.send(CommandStdout {
                    log,
                    is_error: false,
                })?;
            }
            CommandEvent::Stderr(buf) => {
                let log = String::from_utf8_lossy(&buf).to_string();
                trace!("stderr: {}", log);
                on_output.send(CommandStdout {
                    log,
                    is_error: true,
                })?;
            }
            CommandEvent::Terminated(status) => {
                trace!("Process exited with: {:?}", status);
            }
            CommandEvent::Error(error) => {
                error!("Error: {}", error);
                return Err(anyhow!("Execute {command} {error}").into());
            }
            _ => {}
        }
    }

    Ok(())
}

/// 终止指定ID的进程
///
/// 根据不同平台使用相应的命令终止进程:
/// - Unix-like 系统 (Linux, macOS): 使用 `kill -9` 命令
/// - Windows 系统: 使用 `taskkill /PID /F` 命令
///
/// # 参数
/// * `pid` - 要终止的进程ID
///
/// # 返回值
/// 如果成功终止进程则返回 Ok(())，否则返回相应的错误信息
///
/// # 注意事项
/// 终止进程是一个危险操作，应该在用户明确要求时才执行
pub async fn kill_process(pid: u32) -> Result<()> {
    let output = if cfg!(windows) {
        Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .await
    } else {
        Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .await
    };

    match output {
        Ok(output) => {
            if output.status.success() {
                debug!("Successfully killed process {}", pid);
                Ok(())
            } else {
                let error_msg = String::from_utf8_lossy(&output.stderr);
                Err(anyhow!("Failed to kill process {}: {}", pid, error_msg).into())
            }
        }
        Err(e) => Err(anyhow!("Failed to execute kill command: {}", e).into()),
    }
}
