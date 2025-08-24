import { combine, createJSONStorage, persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";
import { TauriStoreState } from "./tauriStoreState";

const store = new TauriStoreState("app-store.json");

// 创建一个初始化函数来处理异步初始化
let isStoreInitialized = false;
async function initializeStore() {
  if (!isStoreInitialized) {
    await store.init();
    isStoreInitialized = true;
  }
}

// 立即调用初始化函数
initializeStore();

type Theme = "light" | "dark" | "system";

export const useAppStore = createWithEqualityFn(
  persist(
    combine(
      {
        accessToken: "",
        theme: "system" as Theme,
        projectDir: "",
        devPid: null as number | null,
      },
      (set) => ({
        setAccessToken: (token: string) => set({ accessToken: token }),
        setTheme: (theme: Theme) => set({ theme }),
        setProjectDir: (path: string) => set({ projectDir: path }),
        setDevPid: (pid: number | null) => set({ devPid: pid }),
      }),
    ),
    {
      name: "app-store",
      storage: createJSONStorage(() => store),
      partialize: (state) => ({
        accessToken: state.accessToken,
        theme: state.theme,
        blogPath: state.projectDir,
      }),
    },
  ),
  shallow,
);
