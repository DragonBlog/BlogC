import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { Outlet } from "react-router-dom";
export const BasicLayout = () => {
  return (
    <ConfigProvider
      theme={{
        cssVar: {
          key: "app",
        },
        hashed: false,
      }}
      locale={zhCN}
    >
      <App>
        <Outlet />
      </App>
    </ConfigProvider>
  );
};
