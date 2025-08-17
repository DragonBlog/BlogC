use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;
mod commands;
mod error;
mod git;
mod oauth;
mod utils;

pub use commands::*;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv::dotenv().unwrap();
    tracing_subscriber::fmt::init();

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
        .invoke_handler(tauri::generate_handler![greet, start, check_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
