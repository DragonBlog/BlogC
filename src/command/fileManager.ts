import { Channel, invoke } from "@tauri-apps/api/core";

export type FileTreeItem = {
  path: string;
  name: string;
  isDir: boolean;
  children?: FileTree;
  size?: number;
};

export type FileTree = FileTreeItem[];

export type ExistFileProcess = "skip" | "overwrite";

export type TransitProcess = {
  copiedBytes: number;
  totalBytes: number;
  fileBytesCopied: number;
  fileTotalBytes: number;
  fileName: string;
  dirName: string;
  state: "normal" | "exists" | "noAccess";
};

export async function readChildren(path: string) {
  return await invoke<FileTreeItem>("read_children", { path });
}

export async function readFileTree(path: string) {
  return await invoke<FileTree>("read_file_tree", { path });
}

/**
 * 删除指定路径的文件或目录
 *
 * @param path 要删除的文件或目录路径
 * @returns Promise<void>
 */
export async function deleteTreeItem(path: string) {
  return await invoke<void>("delete_tree_item", { path });
}

/**
 * 重命名指定路径的文件或目录
 *
 * @param path 要重命名的文件或目录路径
 * @param newName 新的文件名或目录名
 * @returns Promise<string> 返回新的路径
 */
export async function renameTreeItem(path: string, newName: string) {
  return await invoke<string>("rename_tree_item", { path, newName });
}

/**
 * 移动文件或目录到新位置
 *
 * @param path 要移动的文件或目录路径
 * @param newParent 新的父目录路径
 * @param onProgress 进度回调函数
 * @returns Promise<FileTreeItem> 返回移动后的新节点
 */
export async function moveTreeItem(
  path: string,
  newParent: string,
  options: ExistFileProcess = "skip",
  onProgress?: (progress: TransitProcess) => void,
): Promise<FileTreeItem> {
  return await invoke<FileTreeItem>("move_tree_item", {
    path,
    newParent,
    options,
    onProgress: new Channel(onProgress),
  });
}
