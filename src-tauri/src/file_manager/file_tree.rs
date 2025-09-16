use super::FileTreeItem;
use crate::{back_links::is_entry_allowed, error::Result};
use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use std::{
    ops::{Deref, DerefMut},
    path::Path,
};

/// 表示文件树结构，包含多个FileTreeItem
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(transparent)]
pub struct FileTree(pub Vec<FileTreeItem>);

impl Deref for FileTree {
    type Target = Vec<FileTreeItem>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for FileTree {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl From<FileTreeItem> for FileTree {
    fn from(item: FileTreeItem) -> Self {
        FileTree(vec![item])
    }
}

impl From<Vec<FileTreeItem>> for FileTree {
    fn from(items: Vec<FileTreeItem>) -> Self {
        FileTree(items)
    }
}

impl FileTree {
    /// 读取指定路径下的文件树
    ///
    /// # 参数
    /// * `path` - 要读取的目录路径
    ///
    /// # 返回值
    /// 返回Result<FileTree>，包含该目录下的所有.md和.mdx文件及子目录
    pub fn read<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();

        // 检查路径是否存在
        if !path.exists() {
            return Err(anyhow::anyhow!("Path does not exist: {:?}", path).into());
        }

        // 检查是否为目录
        if !path.is_dir() {
            return Err(anyhow::anyhow!("Path is not a directory: {:?}", path).into());
        }

        let mut res = vec![];

        for entry in WalkBuilder::new(path)
            .max_depth(Some(1)) // 只读取一层目录
            .standard_filters(true) // 应用标准过滤器（如.gitignore）
            .filter_entry(is_entry_allowed) // 只保留markdown文件和目录
            .build()
        {
            let entry = entry?;

            // 跳过根目录本身
            if path == entry.path() {
                continue;
            }

            match FileTreeItem::new(entry.path()) {
                Ok(item) => res.push(item),
                Err(e) => {
                    // 记录错误但不中断整个过程
                    tracing::warn!(
                        "Failed to create FileTreeItem for {:?}: {}",
                        entry.path(),
                        e
                    );
                }
            }
        }

        Ok(res.into())
    }
}
