// import {
//   type Child,
//   Command,
//   type SpawnOptions,
//   type TerminatedPayload,
// } from "@tauri-apps/plugin-shell";

import { fetch } from "@tauri-apps/plugin-http";
import { exec, getCommandPath } from "../command";
export type CommandStdout = {
  log: string | Uint8Array;
  isError: boolean;
};

// export async function exec(
//   command: string,
//   args: string[] = [],
//   isSidecar = false,
//   options: SpawnOptions & {
//     onStart?: (child: Child) => void;
//     onOutput?: (output: CommandStdout) => void;
//   } = {}
// ) {
//   const { onOutput, onStart, ...reset } = options;
//   const cmd = isSidecar
//     ? Command.sidecar(command, args, reset)
//     : Command.create(command, args, reset);

//   const child = await cmd.spawn();

//   onStart?.(child);

//   return new Promise<TerminatedPayload>((resolve, reject) => {
//     cmd.on("close", (data) => {
//       resolve(data);
//     });
//     cmd.on("error", (error) => {
//       reject(error);
//     });
//     cmd.stdout.on("data", (data) => {
//       onOutput?.({ log: data, isError: false });
//     });
//     cmd.stderr.on("data", (data) => {
//       onOutput?.({ log: data, isError: true });
//     });
//   });
// }

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))}${sizes[i]}`;
}

export type InstallStatus =
  | "installing_node"
  | "installing_nrm"
  | "checking_network"
  | "installing_pnpm"
  | "installing_dependencies"
  | "completed";

export async function installDependencies(options: {
  onStart?: (child: number) => void;
  onOutput?: (output: CommandStdout) => void;
  cwd: string;
  onStatus?: (status: InstallStatus) => void;
}) {
  const { onStatus } = options;

  try {
    const path = await getCommandPath("node");
    // 用绿色的ansii码打印路径
    options.onOutput?.({
      log: `\x1b[32mfound node at ${path}\x1b[0m\n\n`,
      isError: false,
    });
  } catch (error) {
    onStatus?.("installing_node");
    await exec("fnm", ["install", "24"], true, options);
  }

  try {
    const path = await getCommandPath("npm");
    options.onOutput?.({
      log: `\x1b[32mfound npm at ${path}\x1b[0m\n\n`,
      isError: false,
    });
  } catch (error) {
    throw new Error("npm not found after installing node");
  }

  // 检查是否需要使用中国镜像
  onStatus?.("checking_network");
  const shouldUseChinaMirror = await checkIfChinaUser();

  if (shouldUseChinaMirror) {
    // 配置npm 镜像 为https://registry.npmmirror.com/
    await exec(
      "npm",
      ["config", "set", "registry", "https://registry.npmmirror.com/"],
      false,
      options,
    );
    options.onOutput?.({
      log: "\x1b[32musing taobao npm registry\x1b[0m\n\n",
      isError: false,
    });
  } else {
    // 配置npm 镜像 为官方源
    await exec(
      "npm",
      ["config", "set", "registry", "https://registry.npmjs.org/"],
      false,
      options,
    );
    options.onOutput?.({
      log: "\x1b[32musing official npm registry\n\x1b[0m",
      isError: false,
    });
  }

  // 安装 nrm 并使用 taobao 镜像（可选）
  // onStatus?.("installing_nrm");
  // await exec("npm", ["install", "-g", "nrm"], false, options);

  // await exec("nrm", ["use", "taobao"], false, options);
  // await exec("nrm", ["ls"], false, options);

  try {
    const pnpmPath = await getCommandPath("pnpm");
    options.onOutput?.({
      log: `\x1b[32mfound pnpm at ${pnpmPath}\x1b[0m\n\n`,
      isError: false,
    });
  } catch (error) {
    onStatus?.("installing_pnpm");
    await exec("npm", ["install", "-g", "pnpm"], false, options);
  }

  onStatus?.("installing_dependencies");
  await exec("pnpm", ["install"], false, options);

  onStatus?.("completed");
}

/**
 * 检查用户是否在中国大陆地区
 * 通过测试到不同地区服务器的延迟来判断用户位置
 */
async function checkIfChinaUser(): Promise<boolean> {
  try {
    // 测试到全球服务器的延迟
    const globalPing = await pingTest("https://www.google.com");
    // 测试到中国大陆服务器的延迟
    const chinaPing = await pingTest("https://www.baidu.com");

    console.log(`Global ping: ${globalPing}ms, China ping: ${chinaPing}ms`);
    // 如果到百度的延迟明显低于谷歌，则判断用户在中国大陆
    return chinaPing < globalPing && chinaPing < 300;
  } catch (error) {
    console.error(error);
    // 如果无法连接到谷歌，可能是因为网络限制，判断为中国用户
    try {
      const chinaPing = await pingTest("https://www.baidu.com");
      console.log(`China ping: ${chinaPing}ms`);
      return true;
    } catch (innerError) {
      // 如果都无法连接，使用默认设置
      return false;
    }
  }
}

/**
 * 简单的网络延迟测试
 */
async function pingTest(url: string): Promise<number> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

    await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const endTime = Date.now();
    return endTime - startTime;
  } catch (error) {
    throw new Error(`Failed to ping ${url}`);
  }
}
