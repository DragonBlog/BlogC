import { Channel, invoke } from "@tauri-apps/api/core";

export type ProgressEvent =
  | {
      status: "init";
      total: number;
      filename: string;
    }
  | {
      status: "update";
      downloaded: number;
      total: number;
      filename: string;
    }
  | {
      status: "finish";
      filename: string;
    };

export async function downloadModel(
  modelId: string,
  onProgress?: (progress: ProgressEvent) => void,
) {
  return await invoke<void>("download_model", {
    modelId,
    onProgress: new Channel(onProgress),
  });
}

export async function cancelDownloadModel(modelId: string) {
  return await invoke<void>("cancel_download_model", { modelId });
}
