import { combine, createJSONStorage, persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";
import { TauriStoreState } from "./tauriStoreState";

const store = new TauriStoreState("app-store.json");
await store.init();

type Theme = "light" | "dark" | "system";

export const useAppStore = createWithEqualityFn(
  persist(
    combine(
      {
        accessToken: "",
        theme: "system" as Theme,
      },
      (set) => ({
        setAccessToken: (token: string) => set({ accessToken: token }),
        setTheme: (theme: Theme) => set({ theme }),
      }),
    ),
    {
      name: "app-store",
      storage: createJSONStorage(() => store),
      partialize: (state) => ({ accessToken: state.accessToken }),
    },
  ),
  shallow,
);
