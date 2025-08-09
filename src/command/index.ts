import { Channel, invoke } from "@tauri-apps/api/core";

export async function start(cb: (url: string) => void) {
  const channel = new Channel(cb);
  return await invoke<string>("start", {
    cb: channel,
  });
}
