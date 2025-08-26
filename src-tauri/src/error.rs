use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Git(#[from] git2::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
    #[error(transparent)]
    Shell(#[from] tauri_plugin_shell::Error),
    #[error(transparent)]
    SerdeJson(#[from] serde_json::Error),
    #[error(transparent)]
    Which(#[from] which::Error),
    #[error(transparent)]
    Pattern(#[from] glob::PatternError),
    #[error(transparent)]
    Ignore(#[from] ignore::Error),
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", content = "message")]
#[serde(rename_all = "camelCase")]
enum ErrorKind {
    Io(String),
    Git(String),
    Tauri(String),
    Anyhow(String),
    Shell(String),
    SerdeJson(String),
    Which(String),
    Pattern(String),
    Ignore(String),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let message = self.to_string();
        let king = match self {
            Error::Io(_) => ErrorKind::Io(message),
            Error::Git(_) => ErrorKind::Git(message),
            Error::Tauri(_) => ErrorKind::Tauri(message),
            Error::Anyhow(_) => ErrorKind::Anyhow(message),
            Error::Shell(_) => ErrorKind::Shell(message),
            Error::SerdeJson(_) => ErrorKind::SerdeJson(message),
            Error::Which(_) => ErrorKind::Which(message),
            Error::Pattern(_) => ErrorKind::Pattern(message),

            Error::Ignore(_) => ErrorKind::Ignore(message),
        };
        king.serialize(serializer)
    }
}

pub type Result<T> = std::result::Result<T, Error>;
