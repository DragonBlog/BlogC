import { load, type Store } from "@tauri-apps/plugin-store";
import type { StateStorage } from "zustand/middleware";

export class TauriStoreState implements StateStorage {
  private store: Store | null = null;
  constructor(public storename: string) {}

  async init() {
    this.store = await load(this.storename);
  }

  async getItem(name: string) {
    const res = await this.store?.get<string>(name);
    return res || null;
  }

  async setItem(name: string, value: string) {
    await this.store?.set(name, value);
    this.store?.save();
    console.log("setItem", name, value);
  }

  async removeItem(name: string) {
    await this.store?.delete(name);
    this.store?.save();
  }
}
