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

export function parseMetadata(metadataStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = metadataStr.split("\n");

  for (const line of lines) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    result[key] = value;
  }

  return result;
}
