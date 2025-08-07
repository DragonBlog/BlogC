use crate::oauth::{self, server::Params, Oauth};
use oauth2::{CsrfToken, TokenResponse};
use std::sync::Arc;
use tauri::{ipc::Channel, AppHandle, State};
use tauri_plugin_store::StoreExt;
use tokio::{net::TcpListener, select, sync::Mutex};
use tokio_util::sync::CancellationToken;

#[tauri::command]
pub async fn start(
    app: AppHandle,
    state: State<'_, Arc<Oauth>>,
    cancellation_token: State<'_, Mutex<CancellationToken>>,
    cb: Channel<String>,
) -> tauri::Result<()> {
    // 停止之前的任务
    cancellation_token.lock().await.cancel();

    // 创建新的取消令牌
    let new_cancellation_token = CancellationToken::new();
    *cancellation_token.lock().await = new_cancellation_token.clone();
    let cancellation_token_clone = new_cancellation_token.clone();

    let (url, csrf_token, pkce_verifier) = state.get_auth_url();
    cb.send(url.to_string())?;

    let (tx, mut rx) = tauri::async_runtime::channel::<Params>(1);
    let oauth = state.inner().clone();

    let handler = tauri::async_runtime::spawn(async move {
        let router = oauth::server::oauth_router(tx);
        let listener = TcpListener::bind("localhost:8080").await?;

        select! {
            _ = axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                cancellation_token_clone.cancelled().await;
            })=>{
                Err(anyhow::anyhow!("Server shutdown").into())
            }
            Some(params) = rx.recv()=> {
                let csrf_state = CsrfToken::new(params.state);
                if csrf_state.secret() != csrf_token.secret() {
                    return Err(anyhow::anyhow!("Invalid CSRF token").into());
                }
                let res = oauth.exchange_code(&params.code, pkce_verifier).await?;

                new_cancellation_token.cancel();
                 Ok::<String, tauri::Error>(res.access_token().secret().to_string())
            }
        }
    });

    let token = handler.await??;
    let store = app
        .store("access_token")
        .map_err(|e| anyhow::anyhow!("Failed to store access token: {}", e))?;
    store.set("access_token", token);
    store
        .save()
        .map_err(|e| anyhow::anyhow!("Failed to save access token: {}", e))?;

    Ok(())
}
