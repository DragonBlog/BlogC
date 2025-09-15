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

export async function copyTreeItem(
  path: string,
  newParent: string,
  newName?: string,
  options: ExistFileProcess = "skip",
): Promise<FileTreeItem> {
  return await invoke<FileTreeItem>("copy_tree_item", {
    path,
    newParent,
    newName,
    options,
  });
}

export async function rename(path: string, newName: string) {
  return await invoke<string>("rename", { path, newName });
}
