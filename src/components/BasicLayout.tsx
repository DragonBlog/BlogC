import { App, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { Outlet } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { I18nProvider } from "./I18nProvider";
export const BasicLayout = () => {
  const [language] = useAppStore((store) => [store.language]);
  return (
    <I18nProvider>
      <ConfigProvider
        theme={{
          cssVar: {
            key: "app",
          },
          hashed: false,
        }}
        locale={language === "zh" ? zhCN : enUS}
      >
        <App>
          <Outlet />
        </App>
      </ConfigProvider>
    </I18nProvider>
  );
};
