// import {
//   type Child,
//   Command,
//   type SpawnOptions,
//   type TerminatedPayload,
// } from "@tauri-apps/plugin-shell";
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
  const nodePath = await getCommandPath("node");

  if (!nodePath) {
    onStatus?.("installing_node");
    await exec("binaries/fnm", ["install", "24"], true, options);
  }

  const npmPath = await getCommandPath("npm");

  if (!npmPath) {
    throw new Error("npm not found after installing node");
  }
  onStatus?.("installing_nrm");

  // 配置npm 镜像 为https://registry.npmmirror.com/
  await exec(
    npmPath,
    ["config", "set", "registry", "https://registry.npmmirror.com/"],
    false,
    options,
  );

  // 安装 nrm 并使用 taobao 镜像（可选）
  await exec(npmPath, ["install", "-g", "nrm"], false, options);

  const nrmPath = await getCommandPath("nrm");
  if (!nrmPath) {
    throw new Error("nrm not found after installing nrm");
  }
  await exec(nrmPath, ["use", "taobao"], false, options);
  await exec(nrmPath, ["ls"], false, options);

  let pnpmPath = await getCommandPath("pnpm");

  if (!pnpmPath) {
    onStatus?.("installing_pnpm");

    await exec(npmPath, ["install", "-g", "pnpm"], false, options);
    pnpmPath = await getCommandPath("pnpm");
  }

  onStatus?.("installing_dependencies");

  if (!pnpmPath) {
    throw new Error("pnpm not found after installing pnpm");
  }
  await exec(pnpmPath, ["install"], false, options);

  onStatus?.("completed");
}
