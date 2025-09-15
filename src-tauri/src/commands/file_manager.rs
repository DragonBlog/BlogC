use crate::{error::Result, file_manager::FileTreeItem};
use anyhow::anyhow;
use camino::Utf8PathBuf;
use fs_extra::dir::CopyOptions;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ExistFileProcess {
    Skip,
    Overwrite,
}

impl From<ExistFileProcess> for CopyOptions {
    fn from(value: ExistFileProcess) -> Self {
        let mut options = CopyOptions::new();
        match value {
            ExistFileProcess::Skip => {
                options.overwrite = false;
                options.skip_exist = true;
            }
            ExistFileProcess::Overwrite => {
                options.overwrite = true;
                options.skip_exist = false;
            }
        }
        options
    }
}

#[derive(Debug, Hash, Eq, PartialEq, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CopyTransitState {
    /// Standard state.
    Normal,
    /// Pause state when destination path exists.
    Exists,
    /// Pause state when current process does not have the permission to access from or to
    /// path.
    NoAccess,
}

impl From<fs_extra::dir::TransitState> for CopyTransitState {
    fn from(value: fs_extra::dir::TransitState) -> Self {
        match value {
            fs_extra::dir::TransitState::Normal => CopyTransitState::Normal,
            fs_extra::dir::TransitState::Exists => CopyTransitState::Exists,
            fs_extra::dir::TransitState::NoAccess => CopyTransitState::NoAccess,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyTransitProcess {
    /// Already copied bytes
    pub copied_bytes: u64,
    /// All the bytes which should be copied or moved (dir size).
    pub total_bytes: u64,
    /// Copied bytes on this time for file.
    pub file_bytes_copied: u64,
    /// Size of currently copied file.
    pub file_total_bytes: u64,
    /// Name of currently copied file.
    pub file_name: String,
    /// Name of currently copied folder.
    pub dir_name: String,
    /// Transit state
    pub state: CopyTransitState,
}

impl From<fs_extra::TransitProcess> for CopyTransitProcess {
    fn from(value: fs_extra::TransitProcess) -> Self {
        CopyTransitProcess {
            copied_bytes: value.copied_bytes,
            total_bytes: value.total_bytes,
            file_bytes_copied: value.file_bytes_copied,
            file_total_bytes: value.file_total_bytes,
            file_name: value.file_name,
            dir_name: value.dir_name,
            state: value.state.into(),
        }
    }
}

/// 读取指定路径的子节点
///
/// # 参数
/// * `path` - 要读取的目录路径
///
/// # 返回值
/// 返回Result<FileTreeItem>，包含该目录下的文件和子目录信息
#[tauri::command]
pub async fn read_children(path: Utf8PathBuf) -> Result<FileTreeItem> {
    let mut item = FileTreeItem::new(path)?;
    item.read_children()?;
    Ok(item)
}

#[tauri::command]
pub async fn copy_tree_item(
    path: Utf8PathBuf,
    new_parent: Utf8PathBuf,
    new_name: Option<Utf8PathBuf>,
    options: ExistFileProcess,
) -> Result<FileTreeItem> {
    let new_name = new_name.unwrap_or(
        path.iter()
            .last()
            .ok_or(anyhow!(
                "Unable to get file or folder name from path: {:?}",
                path
            ))?
            .into(),
    );
    let new_path = new_parent.join(new_name);

    let mut item = FileTreeItem::new(path)?;
    item.copy_to(&new_path, options.into())
}

#[tauri::command]
pub async fn move_file_or_folder(
    path: Utf8PathBuf,
    new_parent: Utf8PathBuf,
    new_name: Option<Utf8PathBuf>,
) -> Result<Utf8PathBuf> {
    let new_name = new_name.unwrap_or(
        path.iter()
            .last()
            .ok_or(anyhow!(
                "Unable to get file or folder name from path: {:?}",
                path
            ))?
            .into(),
    );
    let new_path = new_parent.join(new_name);

    tokio::fs::rename(path, &new_path).await?;

    Ok(new_path)
}

#[tauri::command]
pub async fn rename(path: Utf8PathBuf, new_name: Utf8PathBuf) -> Result<Utf8PathBuf> {
    let new_path = path
        .parent()
        .ok_or(anyhow!("Unable to get parent directory of {:?}", path))?
        .join(new_name);

    tokio::fs::rename(path, &new_path).await?;

    Ok(new_path)
}
