import {
  type Child,
  Command,
  type SpawnOptions,
  type TerminatedPayload,
} from "@tauri-apps/plugin-shell";
import { checkCommand } from "../command";

type CommandStdout = {
  log: string | Uint8Array;
  isError: boolean;
};

export async function exec(
  command: string,
  args: string[] = [],
  isSidecar = false,
  options: SpawnOptions & {
    onStart?: (child: Child) => void;
    onOutput?: (output: CommandStdout) => void;
  } = {},
) {
  const { onOutput, onStart, ...reset } = options;
  const cmd = isSidecar
    ? Command.sidecar(command, args, reset)
    : Command.create(command, args, reset);

  const child = await cmd.spawn();

  onStart?.(child);

  return new Promise<TerminatedPayload>((resolve, reject) => {
    cmd.on("close", (data) => {
      resolve(data);
    });
    cmd.on("error", (error) => {
      reject(error);
    });
    cmd.stdout.on("data", (data) => {
      onOutput?.({ log: data, isError: false });
    });
    cmd.stderr.on("data", (data) => {
      onOutput?.({ log: data, isError: true });
    });
  });
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(2))}${sizes[i]}`;
}

export type InstallStatus =
  | "installing_node"
  | "installing_pnpm"
  | "installing_dependencies"
  | "completed";

export async function installDependencies(options: {
  onStart?: (child: Child) => void;
  onOutput?: (output: CommandStdout) => void;
  cwd: string;
  onStatus?: (status: InstallStatus) => void;
}) {
  const { onStatus } = options;
  const hasNode = await checkCommand("node");

  if (!hasNode) {
    onStatus?.("installing_node");
    await exec("binaries/fnm", ["install", "24"], true, options);
  }
  const hasPnpm = await checkCommand("pnpm");
  if (!hasPnpm) {
    onStatus?.("installing_pnpm");

    await exec("npm", ["install", "-g", "pnpm"], false, options);
  }
  onStatus?.("installing_dependencies");

  await exec("pnpm", ["install"], false, options);

  onStatus?.("completed");
}
