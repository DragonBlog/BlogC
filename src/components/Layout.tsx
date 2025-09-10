import type { ProSettings } from "@ant-design/pro-components";
import { ProLayout, SettingDrawer } from "@ant-design/pro-components";
import { Avatar, Dropdown } from "antd";
import { Languages } from "lucide-react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Language, useAppStore } from "@/store/useAppStore";

export default () => {
  const navigate = useNavigate();
  const [settings, setSetting] = useState<Partial<ProSettings> | undefined>({
    fixSiderbar: true,
  });
  const [pathname, setPathname] = useState("/");
  const [language, setLanguage] = useAppStore((store) => [
    store.language,
    store.setLanguage,
  ]);

  return (
    <>
      <ProLayout
        location={{
          pathname,
        }}
        route={{
          routes: [
            {
              path: "/",
              key: "/",
              name: "首页",
            },
            {
              path: "/content-manager",
              name: "内容管理",
            },
            {
              path: "/config",
              name: "配置管理",
            },
            {
              path: "/init",
              name: "初始化",
            },
          ],
        }}
        menuProps={{
          onClick: (e) => {
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
        style={{
          height: "100vh",
        }}
        contentStyle={{
          padding: 0,
        }}
        actionsRender={() => {
          return (
            <Dropdown
              menu={{
                selectable: true,
                defaultSelectedKeys: [language],
                selectedKeys: [language],
                items: [
                  {
                    key: "zh",
                    label: "中文",
                    onClick: () => setLanguage("zh"),
                  },
                  {
                    key: "en",
                    label: "English",
                    onClick: () => setLanguage("en"),
                  },
                ],
                onSelect: (e) => {
                  setLanguage(e.key as Language);
                },
              }}
            >
              <Languages className="size-4" />
            </Dropdown>
          );
        }}
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
    </>
  );
};
