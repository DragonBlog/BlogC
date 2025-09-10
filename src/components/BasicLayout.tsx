import { theme as AntdTheme, App, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { I18nProvider } from "./I18nProvider";

/**
 * 基础布局组件
 *
 * 该组件负责：
 * 1. 设置应用的主题（亮色/暗色）
 * 2. 设置应用的语言（中文/英文）
 * 3. 根据系统偏好自动切换主题
 * 4. 提供Ant Design的全局配置
 */
export const BasicLayout = () => {
  // 从应用状态中获取当前语言和主题设置
  const [language, theme] = useAppStore((store) => [
    store.language,
    store.theme,
  ]);

  // 存储实际使用的主题（可能根据系统偏好调整）
  const [reallyTheme, setReallyTheme] = useState(theme);

  /**
   * 监听主题变化和系统主题偏好变化
   * 当主题设置为"system"时，会根据系统偏好自动切换亮色/暗色主题
   */
  useEffect(() => {
    // 查询系统是否偏好暗色主题
    let query = window.matchMedia("(prefers-color-scheme: dark)");

    // 系统主题偏好变化的监听器
    const listener = (e: MediaQueryListEvent) => {
      setReallyTheme(e.matches ? "dark" : "light");
    };

    // 如果主题设置为"system"，则根据系统偏好设置主题
    if (theme === "system") {
      const systemTheme = query.matches ? "dark" : "light";
      setReallyTheme(systemTheme);
      query.addEventListener("change", listener);
    } else {
      // 如果主题设置为特定值，则直接使用该主题
      setReallyTheme(theme);
    }

    // 清理函数：移除事件监听器
    return () => {
      query.removeEventListener("change", listener);
    };
  }, [theme]);

  /**
   * 应用主题到DOM
   * 当主题发生变化时，切换根元素的dark类名
   */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", reallyTheme === "dark");
  }, [reallyTheme]);

  return (
    // 国际化提供者，为应用提供多语言支持
    <I18nProvider>
      {/* Ant Design全局配置组件 */}
      <ConfigProvider
        theme={{
          cssVar: {
            key: "app",
          },
          hashed: false,
          // 根据当前主题选择Ant Design的主题算法
          algorithm:
            reallyTheme === "dark"
              ? AntdTheme.darkAlgorithm
              : AntdTheme.defaultAlgorithm,
        }}
        // 根据当前语言设置Ant Design的本地化配置
        locale={language === "zh" ? zhCN : enUS}
      >
        {/* Ant Design应用组件，提供消息、模态框等全局功能 */}
        <App className="h-full w-full">
          {/* React Router的Outlet组件，用于渲染子路由 */}
          <Outlet />
        </App>
      </ConfigProvider>
    </I18nProvider>
  );
};
