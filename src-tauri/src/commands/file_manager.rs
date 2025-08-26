use crate::{
    error::Result,
    file_manager::{FileTree, FileTreeItem},
};

#[tauri::command]
pub async fn read_file_tree(path: String) -> Result<FileTree> {
    FileTree::read(path)
}

#[tauri::command]
pub async fn read_children(mut item: FileTreeItem) -> Result<FileTreeItem> {
    item.read_children()?;

    Ok(item)
}
