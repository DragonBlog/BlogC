use super::FileTree;
use crate::error::Result;
use anyhow::anyhow;
use fs_extra::{
    dir::{CopyOptions, TransitProcessResult},
    TransitProcess,
};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};

/// 表示文件树中的一个节点，可以是文件或目录
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeItem {
    pub name: String,
    pub path: PathBuf,
    pub is_dir: bool,
    pub children: Option<FileTree>,
    /// 文件或目录的大小（字节）
    /// 对于目录，这个值可能需要额外计算
    pub size: Option<u64>,
}

impl FileTreeItem {
    /// 创建一个新的FileTreeItem
    ///
    /// # 参数
    /// * `path` - 文件或目录的路径
    ///
    /// # 返回值
    /// 返回Result<FileTreeItem>，如果路径不存在则返回错误
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref().to_path_buf();

        if !path.exists() {
            return Err(anyhow!("Path does not exist: {:?}", path).into());
        }

        let name = path
            .file_name()
            .ok_or_else(|| anyhow!("Unable to get file name from path: {:?}", path))?
            .to_string_lossy()
            .to_string();

        let is_dir = path.is_dir();

        // 不再在创建时立即计算目录大小，避免性能问题
        let size = if is_dir {
            None // 目录大小需要额外计算
        } else {
            Some(path.metadata()?.len())
        };

        Ok(Self {
            name,
            path,
            is_dir,
            children: None,
            size,
        })
    }

    /// 获取文件或目录的大小
    ///
    /// # 返回值
    /// 返回Result<u64>，包含文件或目录的大小（字节）
    pub fn get_size(&mut self) -> Result<u64> {
        if let Some(size) = self.size {
            Ok(size)
        } else {
            let size = fs_extra::dir::get_size(&self.path)?;
            self.size = Some(size);
            Ok(size)
        }
    }

    pub fn read_children(&mut self) -> Result<()> {
        if self.is_dir {
            let tree = FileTree::read(&self.path)?;
            self.children = Some(tree);
        }
        Ok(())
    }

    /// 重命名文件或目录
    ///
    /// # 参数
    /// * `new_name` - 新的文件名或目录名
    ///
    /// # 返回值
    /// 返回Result<()>，成功时更新name和path字段
    pub fn rename(&mut self, new_name: &str) -> Result<()> {
        let new_path = self
            .path
            .parent()
            .ok_or_else(|| anyhow!("Unable to get parent directory for: {:?}", self.path))?
            .join(new_name);

        fs::rename(&self.path, &new_path)?;
        self.name = new_name.to_string();
        self.path = new_path;

        // 重置大小缓存
        if !self.is_dir {
            self.size = Some(self.path.metadata()?.len());
        } else {
            self.size = None;
        }

        Ok(())
    }

    /// 删除文件或目录
    ///
    /// # 返回值
    /// 返回Result<()>，成功时删除磁盘上的文件或目录
    pub fn delete(self) -> Result<()> {
        fs_extra::remove_items(&[self.path])?;
        Ok(())
    }

    /// 移动文件或目录到新位置
    ///
    /// # 参数
    /// * `new_parent` - 新的父目录路径
    /// * `progress_handler` - 进度处理回调函数
    ///
    /// # 返回值
    /// 返回Result<FileTreeItem>，包含移动后的新节点
    pub fn move_to<P, F>(
        self,
        new_parent: P,
        options: CopyOptions,
        progress_handler: F,
    ) -> Result<FileTreeItem>
    where
        P: AsRef<Path>,
        F: FnMut(TransitProcess) -> TransitProcessResult,
    {
        let new_path = new_parent.as_ref().join(&self.name);

        fs_extra::move_items_with_progress(&[&self.path], &new_path, &options, progress_handler)?;

        Ok(FileTreeItem::new(new_path)?)
    }

    /// 复制文件或目录到新位置
    ///
    /// # 参数
    /// * `new_parent` - 新的父目录路径
    /// * `progress_handler` - 进度处理回调函数
    ///
    /// # 返回值
    /// 返回Result<FileTreeItem>，包含复制后的新节点
    pub fn copy_to<P, F>(
        &self,
        new_parent: P,
        options: CopyOptions,
        progress_handler: F,
    ) -> Result<FileTreeItem>
    where
        P: AsRef<Path>,
        F: FnMut(TransitProcess) -> TransitProcessResult,
    {
        let new_path = new_parent.as_ref().join(&self.name);

        fs_extra::copy_items_with_progress(&[&self.path], &new_path, &options, progress_handler)?;

        Ok(FileTreeItem::new(new_path)?)
    }
}
