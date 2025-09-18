use crate::{error::Result, llm::ModelHandler, state::CancellationTokenManager};
use hf_hub::{api::tokio::Progress, Repo};
use serde::Serialize;
use std::sync::{atomic::AtomicUsize, Arc};
use std::time::Duration;
use tauri::{ipc::Channel, State};
use tracing::{error, info, warn};

#[derive(Debug, Serialize)]
#[serde(tag = "status")]
#[serde(rename_all = "camelCase")]
pub enum ProgressEvent {
    Init {
        total: usize,
        filename: String,
    },
    Update {
        downloaded: usize,
        total: usize,
        filename: String,
    },
    Finish {
        filename: String,
    },
}

#[derive(Clone)]
pub struct ProgressImpl {
    total: usize,
    filename: String,
    downloaded: Arc<AtomicUsize>,
    sender: Channel<ProgressEvent>,
}

impl ProgressImpl {
    pub fn new(sender: Channel<ProgressEvent>) -> Self {
        Self {
            total: 0,
            filename: String::new(),
            downloaded: Arc::new(AtomicUsize::new(0)),
            sender,
        }
    }
}

impl Progress for ProgressImpl {
    fn init(
        &mut self,
        size: usize,
        filename: &str,
    ) -> impl std::future::Future<Output = ()> + Send {
        async move {
            self.total = size;
            self.filename = filename.to_string();
            self.downloaded
                .store(0, std::sync::atomic::Ordering::SeqCst);
            self.sender
                .send(ProgressEvent::Init {
                    total: size,
                    filename: filename.to_string(),
                })
                .expect("Failed to send progress data");
        }
    }

    fn update(&mut self, size: usize) -> impl std::future::Future<Output = ()> + Send {
        async move {
            self.downloaded
                .fetch_add(size, std::sync::atomic::Ordering::SeqCst);
            self.sender
                .send(ProgressEvent::Update {
                    total: self.total,
                    filename: self.filename.clone(),
                    downloaded: self.downloaded.load(std::sync::atomic::Ordering::SeqCst),
                })
                .expect("Failed to send progress data");
        }
    }

    fn finish(&mut self) -> impl std::future::Future<Output = ()> + Send {
        async move {
            self.downloaded
                .store(self.total, std::sync::atomic::Ordering::SeqCst);
            self.sender
                .send(ProgressEvent::Finish {
                    filename: self.filename.clone(),
                })
                .expect("Failed to send progress data");
        }
    }
}

#[tauri::command]
pub async fn download_model(
    state: State<'_, CancellationTokenManager>,
    model_id: String,
    on_progress: Channel<ProgressEvent>,
) -> Result<()> {
    if state.is_existing(&model_id).await {
        return Ok(());
    }
    // std::env::remove_var("HF_ENDPOINT");

    let cancellation_token = state.get_token(&model_id).await;
    // let cancellation_token = state.reset(&model_id).await;
    let repo = Repo::model(model_id.clone());
    let handler = ModelHandler::new(None)?;

    let progress = ProgressImpl::new(on_progress);
    let future = handler.predownload_repo(&repo, progress, Some(cancellation_token.clone()));

    tokio::select! {
        res = future => {
            res?;
            info!("Download for model {} completed", model_id);
        }
        _ = cancellation_token.cancelled() => {
            warn!("Download for model {} was cancelled", model_id);
            return Err(anyhow::anyhow!("Download cancelled").into());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn cancel_download_model(
    state: State<'_, CancellationTokenManager>,
    model_id: String,
) -> Result<()> {
    info!("Cancelling download for model {}", model_id);
    state.cancel(&model_id).await;
    Ok(())
}
