import { createWithEqualityFn } from "zustand/traditional";

type ConfigStore = {
  currentPage: string;
  setCurrentPage: (key: string) => void;
};

export const useConfigStore = createWithEqualityFn<ConfigStore>((set) => ({
  currentPage: "general-setting",
  setCurrentPage: (key) => set({ currentPage: key }),
}));
