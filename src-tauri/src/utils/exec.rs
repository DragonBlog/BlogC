use std::{ffi::OsStr, path::Path, process::Stdio};

use crate::error::Result;
use anyhow::anyhow;
use serde::Serialize;
use tauri::ipc::Channel;
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::Command,
};
use tracing::debug;

/// 检查系统中是否存在指定的命令
///
/// 该函数会根据不同的操作系统使用相应的命令检查工具:
/// - Unix-like 系统 (Linux, macOS): 使用 `which` 命令
/// - Windows 系统: 使用 `where` 命令
///
/// # 参数
/// * `command` - 要检查的命令名称
///
/// # 返回值
/// 如果命令存在则返回 true，否则返回 false
///
/// # 错误处理
/// 如果执行命令时发生错误（如权限问题），函数会返回 false 而不是传播错误
pub async fn check_command_exists(command: &str) -> Result<bool> {
    let exist_command = if cfg!(windows) { "where" } else { "which" };

    let output = Command::new(exist_command).arg(command).output().await;
    // 打印执行结果以便调试
    debug!("{command} {exist_command}: {:#?}", output);

    match output {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false), // 如果执行命令失败（如命令不存在），则认为目标命令不存在
    }
}

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
pub async fn execute_command<I, S, P>(
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
    let mut child = Command::new(command)
        .current_dir(dir)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let pid = child
        .id()
        .ok_or(anyhow!("Failed to get child process ID"))?;

    on_start.send(pid)?;

    // 处理 stdout
    let stdout = child.stdout.take().ok_or(anyhow!("Failed to get stdout"))?;
    let stdout_reader = BufReader::new(stdout);
    let mut stdout_lines = stdout_reader.lines();

    // 处理 stderr
    let stderr = child.stderr.take().ok_or(anyhow!("Failed to get stderr"))?;
    let stderr_reader = BufReader::new(stderr);
    let mut stderr_lines = stderr_reader.lines();

    // 使用 tokio::select! 同时处理 stdout、stderr 和进程等待事件
    // 这样可以确保任何事件发生时都能及时响应，而不会阻塞其他事件的处理
    loop {
        tokio::select! {
            // 处理标准输出行
            line_result = stdout_lines.next_line() => {
                match line_result {
                    Ok(Some(line)) => {
                        debug!("stdout: {}", line);
                        // 将标准输出行发送到前端，is_error 设置为 false
                        on_output.send(CommandStdout { log: line, is_error: false })?;
                    }
                    Ok(None) => continue, // stdout 已达文件末尾，继续处理其他流
                    Err(e) => {
                        return Err(e.into());
                    }
                }
            }
            // 处理错误输出行
            line_result = stderr_lines.next_line() => {
                match line_result {
                    Ok(Some(line)) => {
                        debug!("stderr: {}", line);
                        // 将错误输出行发送到前端，is_error 设置为 true
                        on_output.send(CommandStdout { log: line, is_error: true })?;
                    }
                    Ok(None) => continue, // stderr 已达文件末尾，继续处理其他流
                    Err(e) => {
                        return Err(e.into());
                    }
                }
            }
            // 处理子进程完成事件
            status = child.wait()=>{
                let status = status?;
                debug!("Process exited with: {}", status);
                break;
            }
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
