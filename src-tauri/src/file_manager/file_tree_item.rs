use super::FileTree;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeItem {
    pub name: String,
    pub path: PathBuf,
    pub is_dir: bool,
    pub children: Option<FileTree>,
}

impl FileTreeItem {
    pub fn read_children(&mut self) -> Result<()> {
        if self.is_dir {
            let tree = FileTree::read(&self.path)?;
            self.children = Some(tree);
        }
        Ok(())
    }
}
