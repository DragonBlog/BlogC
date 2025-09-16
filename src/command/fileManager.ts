import { invoke } from "@tauri-apps/api/core";

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

export async function moveFileOrFolder(
  path: string,
  newParent: string,
  newName?: string,
) {
  return await invoke<void>("move_file_or_folder", {
    path,
    newParent,
    newName,
  });
}

/**
 * 复制文件或目录树到新位置
 *
 * @param path 要复制的文件或目录路径
 * @param newParent 目标父目录路径
 * @param options 处理已存在文件的策略，默认为"skip"
 * @param onProgress 复制进度回调函数
 * @returns Promise<FileTreeItem> 返回复制后的新节点
 */
export async function copyFileOrFolder(
  path: string,
  newParent: string,
  newName?: string,
  options: ExistFileProcess = "skip",
) {
  return await invoke<string>("copy_file_or_folder", {
    path,
    newParent,
    newName,
    options,
  });
}

export async function rename(path: string, newName: string) {
  return await invoke<string>("rename", { path, newName });
}

export async function watchDir(path: string) {
  return await invoke<void>("watch_dir", { path });
}
