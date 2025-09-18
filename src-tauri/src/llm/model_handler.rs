use anyhow::Result;
use camino::Utf8PathBuf;
use hf_hub::{
    api::tokio::{Api, ApiBuilder, Progress},
    Cache, Repo,
};
use std::{
    ops::{Deref, DerefMut},
    path::PathBuf,
};
use tokio_util::sync::CancellationToken;
use tracing::info;

pub struct ModelHandler {
    api: Api,
    cache: Cache,
}

impl From<Api> for ModelHandler {
    fn from(api: Api) -> Self {
        let cache = Cache::from_env();
        Self { api, cache }
    }
}

impl ModelHandler {
    pub fn new(cache_dir: Option<PathBuf>) -> Result<Self> {
        let cache = if let Some(dir) = cache_dir {
            Cache::new(dir)
        } else {
            Cache::from_env()
        };

        let mut builder = ApiBuilder::from_cache(cache.clone());
        if let Ok(endpoint) = std::env::var("HF_ENDPOINT") {
            builder = builder.with_endpoint(endpoint);
        }

        Ok(Self {
            api: builder.high().build()?,
            cache,
        })
    }
}

impl Deref for ModelHandler {
    type Target = Api;

    fn deref(&self) -> &Self::Target {
        &self.api
    }
}

impl DerefMut for ModelHandler {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.api
    }
}

impl ModelHandler {
    pub async fn get_with_progress<P>(
        &self,
        repo: &Repo,
        filename: &str,
        progress: P,
    ) -> Result<PathBuf>
    where
        P: Progress + Clone + Send + Sync + 'static,
    {
        if let Some(path) = self.cache.repo(repo.clone()).get(filename) {
            Ok(path)
        } else {
            let repo = self.api.repo(repo.clone());
            Ok(repo.download_with_progress(filename, progress).await?)
        }
    }

    pub async fn get_repo_dir(&self, repo: &Repo) -> Result<Vec<Utf8PathBuf>> {
        let api_repo = self.api.repo(repo.clone());
        Ok(api_repo
            .info()
            .await?
            .siblings
            .into_iter()
            .map(|i| Utf8PathBuf::from(i.rfilename))
            .collect::<Vec<_>>())
    }

    pub async fn predownload_repo<P>(
        &self,
        repo: &Repo,
        progress: P,
        cancellation_token: Option<CancellationToken>,
    ) -> Result<()>
    where
        P: Progress + Clone + Send + Sync + 'static,
    {
        let files = self.get_repo_dir(repo).await?;

        info!("Downloading repo {:#?}", files);

        for file in files.iter().filter(|item| {
            matches!(
                item.extension(),
                Some("safetensors" | "pth" | "pt" | "bin" | "json" | "jinja")
            )
        }) {
            let filename = file.as_str();
            info!("Predownloading {filename} from {}", repo.url());
            if let Some(token) = &cancellation_token {
                tokio::select! {
                    res = self.get_with_progress(repo, filename, progress.clone()) => {
                        res?;
                    },
                    _ = token.cancelled() => {
                        info!("Download for file {} was cancelled", filename);
                        return Err(anyhow::anyhow!("Download cancelled").into());
                    }
                }
            } else {
                self.get_with_progress(repo, filename, progress.clone())
                    .await?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::env;

    use super::*;

    #[derive(Debug, Default, Clone)]
    struct MyProgress {
        total: u64,
        current: u64,
        filename: String,
    }

    impl Progress for MyProgress {
        fn init(
            &mut self,
            size: usize,
            filename: &str,
        ) -> impl std::future::Future<Output = ()> + Send {
            async move {
                self.total = size as u64;
                self.filename = filename.to_string();
                info!("Downloading {}\n", filename);
            }
        }

        fn update(&mut self, bytes: usize) -> impl std::future::Future<Output = ()> + Send {
            async move {
                self.current += bytes as u64;
                info!("Downloaded {}/{} bytes", self.current, self.total);
            }
        }

        fn finish(&mut self) -> impl std::future::Future<Output = ()> + Send {
            async move {
                info!("\nDownload {} complete", self.filename);
            }
        }
    }

    #[tokio::test]
    async fn test_predownload_repo() -> Result<()> {
        tracing_subscriber::fmt().init();
        let api = ModelHandler::new(None)?;
        info!("Starting");
        env::remove_var("HF_ENDPOINT");
        // env::set_var("HF_ENDPOINT", "https://hf-mirror.com");
        api.predownload_repo(
            &Repo::model("Qwen/Qwen3-4B".to_string()),
            MyProgress::default(),
            None,
        )
        .await?;
        Ok(())
    }

    #[tokio::test]
    async fn test_get_repo_dir() -> Result<()> {
        let api = ModelHandler::new(None)?;
        let repo = Repo::model("Qwen/Qwen3-4B".to_string());
        let list = api.get_repo_dir(&repo).await?;
        println!("Model files {:#?}", list);
        Ok(())
    }
}
