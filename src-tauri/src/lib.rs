use std::sync::Arc;

use oauth::Oauth;
use tauri::{async_runtime::Mutex, Manager};
use tokio_util::sync::CancellationToken;
mod commands;
mod config;
mod error;
mod git;
mod oauth;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv::dotenv().unwrap();

    #[cfg(dev)]
    tracing_subscriber::fmt()
        .with_max_level(tracing::level_filters::LevelFilter::DEBUG)
        .init();

    let client_id = std::env::var("CLIENT_ID").expect("CLIENT_ID not set");
    let client_secret = std::env::var("CLIENT_SECRET").expect("CLIENT_SECRET not set");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let oauth = oauth::Oauth::new(&client_id, &client_secret, "http://localhost:8080")?;
            app.manage(Arc::new(oauth));
            app.manage(Mutex::new(CancellationToken::new()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start,
            commands::check_dir,
            commands::init_blog,
            commands::check_command_exists,
            commands::execute_command,
            commands::kill_process
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
