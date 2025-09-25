import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import { load, type Store } from "@tauri-apps/plugin-store";
import { debounce } from "lodash";
import type { StateStorage } from "zustand/middleware";

export type Options = {
  onRehydrate?: () => void;
  debounce?: number;
  saveFn?: (
    currentWindow: Window,
    storeName: string,
    store: Store,
  ) => Promise<void>;
};

export class TauriStoreState implements StateStorage {
  private store: Store | null = null;
  private debouncedSave: (() => void) | null = null;
  constructor(
    public storename: string,
    public options?: Options,
  ) {}

  async init() {
    this.store = await load(this.storename);
    const window = getCurrentWindow();

    if (this.options?.onRehydrate) {
      window.listen("rehydrate", this.options.onRehydrate);
    }

    const saveFn = () => {
      this.options?.saveFn
        ? this.options?.saveFn(window, this.storename, this.store!)
        : this.store?.save();
    };

    this.debouncedSave = this.options?.debounce
      ? debounce(saveFn, this.options.debounce)
      : saveFn;
  }

  async getItem(name: string) {
    const res = await this.store?.get<string>(name);
    return res || null;
  }

  async setItem(name: string, value: string) {
    await this.store?.set(name, value);
    this.debouncedSave?.();
  }

  async removeItem(name: string) {
    await this.store?.delete(name);
    this.debouncedSave?.();
  }
}
