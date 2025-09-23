// store/useTreeStore.ts

import type { TreeInstance } from "@headless-tree/core";
import { create } from "zustand";
import type { FileTreeItem } from "@/command/fileManager";

interface TreeStore {
  treeRef: TreeInstance<FileTreeItem> | null;
  setTreeRef: (tree: TreeInstance<FileTreeItem> | null) => void;
}

export const useTreeStore = create<TreeStore>((set) => ({
  treeRef: null,
  setTreeRef: (tree) => set({ treeRef: tree }),
}));
