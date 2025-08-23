import { CrownFilled, SmileFilled } from "@ant-design/icons";
import type { ProSettings } from "@ant-design/pro-components";
import { ProLayout, SettingDrawer } from "@ant-design/pro-components";
import { App, Avatar, ConfigProvider } from "antd";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

export default () => {
  const navigate = useNavigate();
  const [settings, setSetting] = useState<Partial<ProSettings> | undefined>({
    fixSiderbar: true,
  });
  const [pathname, setPathname] = useState("/welcome");
  return (
    <div>
      <ConfigProvider theme={{ cssVar: true, hashed: false }}>
        <App>
          <ProLayout
            location={{
              pathname,
            }}
            route={{
              path: "/",
              routes: [
                {
                  path: "/",
                  name: "首页",
                },
                {
                  path: "/terminal",
                  name: "欢迎",
                  icon: <SmileFilled />,
                },
                {
                  path: "/",
                  name: "管理页",
                  icon: <CrownFilled />,
                  access: "canAdmin",
                },
                {
                  path: "/init",
                  name: "初始化",
                },
              ],
            }}
            menuProps={{
              onClick: (e) => {
                console.log(e);
                setPathname(e.key);
                navigate(e.key);
              },
            }}
            onPageChange={(location) => {
              setPathname(location?.pathname ?? "");
            }}
            avatarProps={{
              title: "博客管理系统",
              icon: <Avatar />,
              style: {
                margin: "auto",
              },
            }}
            {...settings}
          >
            <Outlet />
          </ProLayout>
          <SettingDrawer
            pathname={pathname}
            getContainer={() => document.getElementById("test-pro-layout")}
            settings={settings}
            onSettingChange={(changeSetting) => {
              setSetting(changeSetting);
            }}
            disableUrlParams
          />
        </App>
      </ConfigProvider>
    </div>
  );
};
