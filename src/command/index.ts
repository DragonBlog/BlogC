import { Channel, invoke } from "@tauri-apps/api/core";

export async function start(cb: (url: string) => void) {
  const channel = new Channel(cb);
  await invoke("start", {
    cb: channel,
  });
}
