use crate::oauth::{self, server::Params, Oauth};
use oauth2::{CsrfToken, TokenResponse};
use std::sync::Arc;
use tauri::{ipc::Channel, State};
use tokio::{net::TcpListener, select, sync::Mutex};
use tokio_util::sync::CancellationToken;
use tracing::info;

#[tauri::command]
pub async fn start(
    state: State<'_, Arc<Oauth>>,
    cancellation_token: State<'_, Mutex<CancellationToken>>,
    cb: Channel<String>,
) -> tauri::Result<()> {
    cancellation_token.lock().await.cancel();

    let new_cancellation_token = CancellationToken::new();
    *cancellation_token.lock().await = new_cancellation_token.clone();
    let cancellation_token_clone = new_cancellation_token.clone();

    let (url, csrf_token, pkce_verifier) = state.get_auth_url();
    cb.send(url.to_string())?;

    let (tx, mut rx) = tauri::async_runtime::channel::<Params>(1);
    let oauth = state.inner().clone();

    let handler = tauri::async_runtime::spawn(async move {
        info!("Starting OAuth server at http://localhost:8080");

        let router = oauth::server::oauth_router(tx);
        let listener = TcpListener::bind("localhost:8080").await?;

        select! {
            _ = axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                cancellation_token_clone.cancelled().await;
                info!("Shutting down OAuth server");
            })=>{
                info!("OAuth server stopped");
            }
            Some(params) = rx.recv()=> {
                let csrf_state = CsrfToken::new(params.state);
                if csrf_state.secret() != csrf_token.secret() {
                    return Err(anyhow::anyhow!("Invalid CSRF token").into());
                }
                let res = oauth.exchange_code(&params.code, pkce_verifier).await?;

                info!("Access token: {}", res.access_token().secret());
                new_cancellation_token.cancel();
            }
        }

        info!("OAuth server stopped 2");
        Ok::<(), tauri::Error>(())
    });

    handler.await??;
    Ok(())
}
