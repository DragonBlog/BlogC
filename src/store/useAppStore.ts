import { combine, createJSONStorage, persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";
import { TauriStoreState } from "./tauriStoreState";

const store = new TauriStoreState("app-store.json");
await store.init();

export const useAppStore = createWithEqualityFn(
  persist(
    combine(
      {
        accessToken: "",
      },
      (set) => ({
        setAccessToken: (token: string) => set({ accessToken: token }),
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
