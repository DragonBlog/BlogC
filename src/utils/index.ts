import {
  type Child,
  Command,
  type SpawnOptions,
  type TerminatedPayload,
} from "@tauri-apps/plugin-shell";

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
