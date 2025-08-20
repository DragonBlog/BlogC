import {
  type CommandStdout,
  checkCommand,
  executeCommand,
  installNode,
} from "../command";

export async function checkAndInstallDependencies(
  onOutput?: (output: CommandStdout) => void,
  onStart?: (pid: number) => void,
) {
  const hasNode = await checkCommand("node");
  const hasPnpm = await checkCommand("pnpm");

  if (!hasNode) {
    await installNode(onOutput, onStart);
  }

  await executeCommand("node", ["-v"], {
    onOutput,
    onStart,
  });

  if (!hasPnpm) {
    await executeCommand("npm", ["install", "-g", "pnpm"], {
      onOutput,
      onStart,
    });
  }

  await executeCommand("pnpm", ["-v"], {
    onOutput,
    onStart,
  });
}
