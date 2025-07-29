use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
pub use commands::*;
mod oauth;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv::dotenv().unwrap();

    let client_id = std::env::var("CLIENT_ID").expect("CLIENT_ID not set");
    let client_secret = std::env::var("CLIENT_SECRET").expect("CLIENT_SECRET not set");

    tauri::Builder::default()
        .setup(move |app| {
            let oauth = oauth::Oauth::new(&client_id, &client_secret, "http://localhost:8080")?;
            app.manage(oauth);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, start])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
