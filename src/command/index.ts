import { Channel, invoke } from "@tauri-apps/api/core";

/**
 * 命令执行错误类型定义
 *
 * @property kind - 错误类型，包括io(输入输出错误)、tauri(Tauri相关错误)、git(Git操作错误)、anyhow(通用错误)
 * @property message - 错误详细信息
 */
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

/**
 * 初始化博客进度状态类型定义
 *
 * @property type - 进度类型，包括:
 *                  "receiving"(接收中) - data包含[百分比, 字节数]
 *                  "processing"(处理中) - data包含处理进度数值
 *                  "finished"(已完成) - 无附加数据
 */
type Progress =
  | {
      type: "receiving";
      data: [number, number]; // [percent, bytes]
    }
  | {
      type: "processing";
      data: number;
    }
  | {
      type: "finished";
    };

/**
 * 初始化博客项目
 *
 * @param path - 博客项目路径
 * @param cb - 进度回调函数，接收初始化进度状态
 * @returns 返回Promise，包含初始化结果
 *
 * @remarks
 * 该函数通过Tauri命令调用Rust后端的init_blog函数，
 * 用于初始化博客项目，并通过回调函数实时返回进度信息。
 */
export async function initBlog(path: string, cb: (progress: Progress) => void) {
  return await invoke("init_blog", { path, onProgress: new Channel(cb) });
}

/**
 * 检查命令是否存在
 *
 * @param command - 需要检查的命令名称
 * @returns 返回Promise，包含布尔值表示命令是否存在
 *
 * @remarks
 * 该函数通过Tauri命令调用Rust后端的check_command_exists函数，
 * 用于检查系统中是否存在指定的命令。
 */
export async function checkCommand(command: string): Promise<boolean> {
  return await invoke("check_command_exists", { command });
}

/**
 * 命令执行输出类型定义
 *
 * @property log - 命令输出日志内容
 * @property isError - 是否为错误输出
 */
export type CommandStdout = {
  log: string;
  isError: boolean;
};

/**
 * 执行系统命令
 *
 * @param command - 要执行的命令
 * @param args - 命令参数数组
 * @param options - 执行选项
 * @param options.onOutput - 命令输出回调函数
 * @param options.onStart - 命令启动回调函数，返回进程ID
 * @param options.currentDir - 命令执行目录
 * @returns 返回Promise，表示命令执行完成
 *
 * @remarks
 * 该函数通过Tauri命令调用Rust后端的execute_command函数，
 * 用于执行系统命令，并通过回调函数实时返回输出信息和进程ID。
 */
export async function executeCommand(
  command: string,
  args: string[],
  options: {
    onOutput?: (output: CommandStdout) => void;
    onStart?: (pid: number) => void;
    currentDir?: string;
  },
): Promise<void> {
  const { onOutput, onStart, currentDir } = options;
  return await invoke("execute_command", {
    command,
    args,
    currentDir,
    onOutput: new Channel(onOutput),
    onStart: new Channel(onStart),
  });
}

/**
 * 终止指定进程
 *
 * @param pid - 进程ID
 * @returns 返回Promise，表示终止操作完成
 *
 * @remarks
 * 该函数通过Tauri命令调用Rust后端的kill_process函数，
 * 用于终止指定ID的进程。
 */
export async function kill(pid: number): Promise<void> {
  return await invoke("kill_process", { pid });
}

/**
 * 安装Node.js环境
 *
 * @param onOutput - 命令输出回调函数
 * @param onStart - 命令启动回调函数，返回进程ID
 * @returns 返回Promise，表示安装完成
 *
 * @remarks
 * 该函数通过Tauri命令调用Rust后端的install_node函数，
 * 用于安装Node.js环境，并通过回调函数实时返回输出信息和进程ID。
 */
export async function installNode(
  onOutput?: (output: CommandStdout) => void,
  onStart?: (pid: number) => void,
): Promise<void> {
  return await invoke("install_node", {
    onOutput: new Channel(onOutput),
    onStart: new Channel(onStart),
  });
}

/**
 * 读取项目模式配置
 *
 * @param projectDir - 项目目录路径
 * @returns 返回Promise，包含项目模式配置对象
 *
 * @remarks
 * 该函数通过Tauri命令调用Rust后端的read_schemas函数，
 * 用于读取项目的模式配置信息。
 */
export async function readSchemas(
  projectDir: string,
): Promise<Record<string, unknown>> {
  return await invoke("read_schemas", { projectDir });
}

/**
 * 博客构建配置类型定义
 *
 * @property public_dir - 公共目录路径
 * @property entries - 入口项配置记录
 */
export type BlogBuildConfig = {
  public_dir: string;
  entries: Record<string, EntryItem>;
};

/**
 * 入口项配置类型定义
 *
 * @property title - 标题
 * @property description - 描述
 * @property entry_base - 入口基础路径
 */
export type EntryItem = {
  title: string;
  description: string;
  entry_base: string;
};

/**
 * 读取博客构建配置
 *
 * @param projectDir - 项目目录路径
 * @returns 返回Promise，包含博客构建配置对象
 *
 * @remarks
 * 该函数通过Tauri命令调用Rust后端的read_blog_build_config函数，
 * 用于读取博客项目的构建配置信息。
 */
export async function readBlogBuildConfig(
  projectDir: string,
): Promise<BlogBuildConfig> {
  return await invoke("read_blog_build_config", { projectDir });
}
