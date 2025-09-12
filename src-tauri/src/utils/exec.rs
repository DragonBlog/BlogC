use std::{ffi::OsStr, path::Path};

use crate::error::Result;
use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, Runtime};
use tauri_plugin_shell::{process::CommandEvent, Shell};
use tracing::{debug, error};
use which::which_global;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommandStdout {
    pub is_error: bool,
    pub log: String,
}

pub async fn exec<I, S, P, R: Runtime>(
    shell: &Shell<R>,
    command: &str,
    sidecar: bool,
    args: I,
    cwd: Option<P>,
    on_output: Channel<CommandStdout>,
    on_start: Channel<u32>,
) -> Result<()>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
    P: AsRef<Path>,
{
    let (mut rx, child) = if sidecar {
        let mut command = shell.sidecar(command)?.args(args);

        if let Some(dir) = cwd.as_ref() {
            command = command.current_dir(dir);
        };

        command.spawn()?
    } else {
        let command_path = which_global(command)?;
        let mut command = shell.command(command_path).args(args);

        if let Some(dir) = cwd.as_ref() {
            command = command.current_dir(dir);
        };

        command.spawn()?
    };

    on_start.send(child.pid())?;

    while let Some(output) = rx.recv().await {
        match output {
            CommandEvent::Stdout(buf) => {
                let log = String::from_utf8_lossy(&buf).to_string();
                debug!("stdout: {}", log);
                on_output.send(CommandStdout {
                    log,
                    is_error: false,
                })?;
            }
            CommandEvent::Stderr(buf) => {
                let log = String::from_utf8_lossy(&buf).to_string();
                debug!("stderr: {}", log);
                on_output.send(CommandStdout {
                    log,
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
