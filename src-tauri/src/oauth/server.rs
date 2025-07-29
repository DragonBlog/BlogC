use axum::{
    extract::{Query, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::Deserialize;
use tauri::async_runtime::Sender;

pub fn oauth_router(tx: Sender<Params>) -> Router {
    Router::new().route("/", get(get_code)).with_state(tx)
}

#[derive(Deserialize)]
pub struct Params {
    pub code: String,
    pub state: String,
}
async fn get_code(params: Query<Params>, state: State<Sender<Params>>) -> impl IntoResponse {
    state.send(params.0).await.unwrap();
}
