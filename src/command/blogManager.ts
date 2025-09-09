import { Channel, invoke } from "@tauri-apps/api/core";
import { Progress } from ".";

export async function initOrOpenBlog(path: string): Promise<boolean> {
  return await invoke<boolean>("init_or_open_blog", { path });
}

export async function installTemplate(
  path: string,
  cb: (progress: Progress) => void,
): Promise<void> {
  return await invoke<void>("install_template", {
    path,
    onProgress: new Channel(cb),
  });
}
