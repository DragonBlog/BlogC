use std::collections::HashMap;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

#[derive(Default)]
pub struct CancellationTokenManager {
    tokens: Mutex<HashMap<String, CancellationToken>>,
}

impl CancellationTokenManager {
    pub async fn get_token(&self, key: &str) -> CancellationToken {
        let mut tokens = self.tokens.lock().await;
        tokens
            .entry(key.to_string())
            .or_insert_with(|| CancellationToken::new())
            .clone()
    }

    pub async fn cancel(&self, key: &str) {
        let mut tokens = self.tokens.lock().await;
        if let Some(token) = tokens.get(key) {
            token.cancel();
        }
        tokens.remove(key);
    }

    pub async fn is_existing(&self, key: &str) -> bool {
        let tokens = self.tokens.lock().await;
        tokens.contains_key(key)
    }

    pub async fn reset(&self, key: &str) -> CancellationToken {
        let mut tokens = self.tokens.lock().await;
        let token = CancellationToken::new();
        tokens.insert(key.to_string(), token.clone());
        token
    }

    pub async fn cancel_all(&self) {
        let mut tokens = self.tokens.lock().await;
        for token in tokens.values() {
            token.cancel();
        }
        tokens.clear();
    }
}
