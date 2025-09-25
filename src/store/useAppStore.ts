import { combine, createJSONStorage, persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";
import { storeSave } from "@/command";
import { TauriStoreState } from "./tauriStoreState";

const store = new TauriStoreState("app-store.json", {
  onRehydrate: () => {
    useAppStore.persist.rehydrate();
  },
  saveFn: async (currentWindow, storeName) => {
    await storeSave(storeName, currentWindow.label);
  },
});

await store.init();

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "zh";

export const useAppStore = createWithEqualityFn(
  persist(
    combine(
      {
        accessToken: "",
        theme: "system" as Theme,
        projectDir: "",
        devPid: null as number | null,
        language: "zh" as Language,
      },
      (set) => ({
        setAccessToken: (token: string) => set({ accessToken: token }),
        setTheme: (theme: Theme) => set({ theme }),
        setProjectDir: (path: string) => set({ projectDir: path }),
        setDevPid: (pid: number | null) => set({ devPid: pid }),
        setLanguage: (lang: Language) => set({ language: lang }),
      }),
    ),
    {
      name: "app-store",
      storage: createJSONStorage(() => store),
      partialize: (state) => ({
        accessToken: state.accessToken,
        theme: state.theme,
        projectDir: state.projectDir,
        language: state.language,
      }),
    },
  ),
  shallow,
);
