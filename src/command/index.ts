import { Channel, invoke } from "@tauri-apps/api/core";

export type CommandError = {
  kind: "io" | "tauri" | "git" | "anyhow";
  message: string;
};

/**
 * 启动OAuth认证流程
 *
 * @param cb - 回调函数，接收认证服务器URL作为参数
 * @returns 返回Promise，包含认证结果或错误信息
 *
 * @remarks
 * 该函数用于启动GitHub OAuth认证流程，通过Tauri命令调用Rust后端的start函数。
 * 认证服务器URL通过回调函数传递给前端，以便用户进行授权。
 */
export async function start(cb: (url: string) => void) {
  const channel = new Channel(cb);
  return await invoke<string>("start", {
    cb: channel,
  });
}

/**
 * 检查指定目录是否存在及其是否为空
 *
 * @param dir - 需要检查的目录路径
 * @returns 返回Promise，包含目录状态信息
 *
 * @remarks
 * 该函数通过Tauri命令调用Rust后端的check_dir函数，
 * 用于检查指定目录是否存在以及是否为空目录。
 *
 * @returns {{exists: boolean, isEmpty: boolean}}
 *          exists: 目录是否存在
 *          isEmpty: 目录是否为空
 */
export async function checkDir(dir: string) {
  return await invoke<{
    exists: boolean;
    isEmpty: boolean;
  }>("check_dir", { path: dir });
}
