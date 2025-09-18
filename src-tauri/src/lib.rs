use notify::RecommendedWatcher;
use serde_json::Value;
use std::{env, sync::Arc};
use tauri::{async_runtime::Mutex, Manager};
use tauri_plugin_shell::ShellExt;
use tokio_util::sync::CancellationToken;
use tracing::info;

use crate::state::CancellationTokenManager;
mod back_links;
mod blog_manager;
mod commands;
mod config;
mod db;
mod error;
mod file_manager;
mod git;
// mod llm;
mod md_parser;
mod oauth;
mod state;
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
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let oauth = oauth::Oauth::new(&client_id, &client_secret, "http://localhost:8080")?;
            app.manage(Arc::new(oauth));
            app.manage(Mutex::new(CancellationToken::new()));
            app.manage(Mutex::new(None::<RecommendedWatcher>));
            app.manage(CancellationTokenManager::default());

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
            // utils
            commands::check_dir,
            commands::get_command_path,
            commands::exec,
            // oauth
            commands::start,
            // file manager
            commands::read_children,
            commands::copy_file_or_folder,
            commands::move_file_or_folder,
            commands::rename,
            commands::watch_dir,
            // blog manager
            commands::read_schemas,
            commands::read_blog_build_config,
            commands::init_or_open_blog,
            commands::install_template,
            commands::get_templates,
            // llm
            // commands::download_model,
            // commands::cancel_download_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
