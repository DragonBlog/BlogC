//@ts-ignore

import { Channel, invoke } from "@tauri-apps/api/core";
import PathBrowserify from "path-browserify";

export type FileTreeItem = {
  path: string;
  name: string;
  isDir: boolean;
  children?: FileTreeItem[];
  size?: number;
};

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

export async function moveFileOrFolder(path: string, newParent: string) {
  return await invoke<void>("move_file_or_folder", { path, newParent });
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

/**
 * windows生成重命名后的新路径
 * @param path 原始路径
 * @param newName 新的文件名或文件夹名
 * @returns 新路径
 */
export function getNewPath(path: string, newName: string): string {
  const normalizedPath = path.replace(/\\/g, "/");

  let parentDir = PathBrowserify.dirname(normalizedPath);

  if (/^[A-Za-z]:$/.test(parentDir)) {
    parentDir += "/";
  }

  return `${parentDir}/${newName}`;
}
