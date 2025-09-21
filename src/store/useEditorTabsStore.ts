import { PlateEditor } from "platejs/react";
import { combine, createJSONStorage, persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";
import { FileTreeItem } from "@/command/fileManager";
import { TauriStoreState } from "./tauriStoreState";

const store = new TauriStoreState("editor-tabs-store.json");

await store.init();

export type EditorTab = {
  id: string;
  fileItem?: FileTreeItem;
  isEdited?: boolean;
  isSaved?: boolean;
};

export const useEditorTabsStore = createWithEqualityFn(
  persist(
    combine(
      {
        tabs: [] as EditorTab[],
        autoSave: true,
        autoSaveTimeout: 10000, // 默认自动保存间隔为10秒
        activeTabId: "",
        selectedItem: "",
        currentMonitorEditor: undefined as PlateEditor | undefined,
        sideType: "file" as "file" | "toc",
      },
      (set) => ({
        setTabs: (tabs: EditorTab[]) => set({ tabs }),
        setAutoSave: (autoSave: boolean) => set({ autoSave }),
        setAutoSaveTimeout: (timeout: number) =>
          set({ autoSaveTimeout: timeout }),
        setActiveTabId: (id: string) => set({ activeTabId: id }),
        setSelectedItem: (path: string) => set({ selectedItem: path }),
        setCurrentMonitorEditor: (editor: PlateEditor | undefined) =>
          set({ currentMonitorEditor: editor }),
        setSideType: (type: "file" | "toc") => set({ sideType: type }),
      }),
    ),
    {
      name: "editor-tabs-store",
      storage: createJSONStorage(() => store),
      partialize: (state) => ({
        tabs: state.tabs,
        autoSave: state.autoSave,
        autoSaveTimeout: state.autoSaveTimeout,
        activeTabId: state.activeTabId,
        selectedItem: state.selectedItem,
      }),
    },
  ),
  shallow,
);
