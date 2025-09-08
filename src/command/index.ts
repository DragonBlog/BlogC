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
export type Progress =
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
