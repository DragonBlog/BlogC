use serde_json::Value;
use std::{env, sync::Arc};
use tauri::{async_runtime::Mutex, Manager};
use tauri_plugin_shell::ShellExt;
use tokio_util::sync::CancellationToken;
use tracing::info;
mod commands;
mod config;
mod error;
mod file_manager;
mod git;
mod oauth;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv::dotenv().ok();

    // #[cfg(debug_assertions)]
    tracing_subscriber::fmt()
        .with_max_level(tracing::level_filters::LevelFilter::DEBUG)
        .init();

    let client_id = std::env::var("CLIENT_ID").unwrap_or("Ov23liIHBBSfYdQbH8LK".to_string());
    let client_secret = std::env::var("CLIENT_SECRET")
        .unwrap_or("91cca246b43b848af21e97037a68015fc0726381".to_string());

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let oauth = oauth::Oauth::new(&client_id, &client_secret, "http://localhost:8080")?;
            app.manage(Arc::new(oauth));
            app.manage(Mutex::new(CancellationToken::new()));

            let command = app.shell().sidecar("fnm")?;

            tauri::async_runtime::spawn(async move {
                env::set_var("FORCE_COLOR", "1");
                let output = command
                    .args(["env", "--json"])
                    .output()
                    .await
                    .expect("Failed to get fnm output");

                if output.status.success() {
                    let res: Value =
                        serde_json::from_slice(&output.stdout).expect("Failed to parse fnm output");

                    info!("fnm output: {res:#?}");

                    let node_path = res["FNM_MULTISHELL_PATH"]
                        .as_str()
                        .expect("FNM_MULTISHELL_PATH not found in fnm output");
                    let path = env::var("PATH").unwrap_or_default();
                    env::set_var("PATH", format!("{node_path}/bin:{path}"));
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start,
            commands::check_dir,
            commands::init_blog,
            commands::check_command_exists,
            commands::read_schemas,
            commands::read_blog_build_config,
            commands::read_file_tree,
            commands::read_children,
            commands::delete_tree_item,
            commands::rename_tree_item,
            commands::move_tree_item,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
