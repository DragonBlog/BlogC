# Copilot Instructions for BlogC

## 项目架构概览

- 前端采用 React + Vite，主入口为 `src/main.tsx`，核心布局在 `src/components/BasicLayout.tsx` 和 `src/components/Layout.tsx`。
- 编辑器相关代码集中在 `src/components/editor/`，支持 Markdown 编辑、图片上传、内容管理。
- 文件/博客管理逻辑在 `src/command/`（如 `blogManager.ts`、`fileManager.ts`），与 UI 组件解耦。
- Tauri 后端在 `src-tauri/`，Rust 实现本地文件操作、配置、OAuth 等。
- 路由定义在 `src/router/router.tsx`，页面入口在 `src/pages/`。

## 关键开发流程

- 启动开发环境：
  - 前端：`pnpm dev`（根目录）
  - Tauri 桌面端：`pnpm tauri dev`（`src-tauri` 目录）
- 主要依赖：React、Vite、Tauri、Lingui（i18n）、Less、Uniforms（表单生成）、Astro（博客模版）
- Markdown 编辑器支持自定义插件，扩展点在 `src/components/editor/plugins/`。
- 图片上传与管理逻辑在 `src/lib/uploadthing.ts` 和相关 hooks。

## 项目约定与模式

- 文件/博客操作统一通过 `command/` 下的管理器实现，避免直接在组件中操作文件。
- 组件样式优先使用 Less，样式文件与组件同目录（如 `index.module.less`）。
- 国际化采用 Lingui，资源文件在 `src/locales/`。
- 表单根据 Astro collection 的 schema 动态生成，相关逻辑在 `src/components/SchemaForm/`。
- 所有页面入口在 `src/pages/`，路由统一由 `src/router/router.tsx` 管理。

## 重要目录/文件参考

- `src/components/editor/`：富文本/Markdown 编辑器实现与扩展
- `src/command/`：文件与博客管理核心逻辑
- `src-tauri/`：Rust 后端，桌面端集成
- `src/pages/`：页面入口
- `src/lib/`：工具库与通用逻辑
- `README.md`：功能与痛点、目标用户、核心功能说明

## 其他说明

- 支持批量导入博客、分类/标签管理、图片上传、博客预览与部署（GitHub Pages/Vercel）。
- 代码风格遵循 TypeScript + React 约定，hooks 统一放在 `src/hooks/`。
- 重要自定义表单生成依赖 [Uniforms](https://github.com/vazco/uniforms)。

---

如需补充项目约定、开发流程或架构细节，请在 PR 或 Issue 中说明。
