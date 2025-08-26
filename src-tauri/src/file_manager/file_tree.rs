use super::FileTreeItem;
use crate::error::Result;
use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use std::{
    ops::{Deref, DerefMut},
    path::Path,
};

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

fn is_markdown_file(entry: &ignore::DirEntry) -> bool {
    if entry.path().is_file() {
        if let Some(ext) = entry.path().extension() {
            ext == "md" || ext == "mdx"
        } else {
            false
        }
    } else {
        true
    }
}

impl FileTree {
    pub fn read<P: AsRef<Path>>(path: P) -> Result<Self> {
        let mut res = vec![];

        for entry in WalkBuilder::new(&path)
            .max_depth(Some(1))
            .standard_filters(true)
            .filter_entry(is_markdown_file)
            .build()
        {
            let entry = entry?;

            if path.as_ref() == entry.path() {
                continue;
            }

            let item = FileTreeItem {
                name: entry.file_name().to_string_lossy().to_string(),
                path: entry.path().to_path_buf(),
                is_dir: entry.path().is_dir(),
                children: None,
            };
            res.push(item);
        }

        Ok(res.into())
    }
}
