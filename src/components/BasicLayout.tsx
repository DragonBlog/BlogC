import { App, ConfigProvider } from "antd";
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
    >
      <App>
        <Outlet />
      </App>
    </ConfigProvider>
  );
};
