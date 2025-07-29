use oauth2::{CsrfToken, TokenResponse};
use tauri::{ipc::Channel, State};
use tokio::net::TcpListener;

use crate::oauth::{self, server::Params, Oauth};

#[tauri::command]
pub async fn start(state: State<'_, Oauth>, cb: Channel<String>) -> tauri::Result<()> {
    let (url, csrf_token, pkce_verifier) = state.get_auth_url();
    cb.send(url.to_string())?;

    let (tx, mut rx) = tauri::async_runtime::channel::<Params>(1);

    let handler = tauri::async_runtime::spawn(async move {
        println!("Starting OAuth server at http://localhost:8080");
        let router = oauth::server::oauth_router(tx);
        let listener = TcpListener::bind("localhost:8080")
            .await
            .expect("Failed to bind to port");
        axum::serve(listener, router).await
    });

    if let Some(params) = rx.recv().await {
        let csrf_state = CsrfToken::new(params.state);
        if csrf_state.secret() != csrf_token.secret() {
            return Err(anyhow::anyhow!("Invalid CSRF token").into());
        }
        let res = state.exchange_code(&params.code, pkce_verifier).await?;

        println!("Access token: {}", res.access_token().secret());
    }
    handler.abort();
    Ok(())
}
