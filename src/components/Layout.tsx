import type { ProSettings } from "@ant-design/pro-components";
import { ProLayout, SettingDrawer } from "@ant-design/pro-components";
import { useLingui } from "@lingui/react/macro";
import { Avatar, Dropdown } from "antd";
import { Languages, Moon, Sun, SunMoon } from "lucide-react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { match } from "ts-pattern";
import { Language, Theme, useAppStore } from "@/store/useAppStore";

export default () => {
  const navigate = useNavigate();
  const [settings, setSetting] = useState<Partial<ProSettings> | undefined>({
    fixSiderbar: true,
  });
  const { t } = useLingui();

  const [pathname, setPathname] = useState("/");
  const [language, setLanguage, theme, setTheme] = useAppStore((store) => [
    store.language,
    store.setLanguage,
    store.theme,
    store.setTheme,
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
          return [
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
            </Dropdown>,
            <Dropdown
              menu={{
                selectable: true,
                selectedKeys: [theme],
                items: [
                  {
                    key: "light",
                    label: t`浅色模式`,
                    icon: <Sun className="size-4" />,
                    onClick: () => setTheme("light"),
                  },
                  {
                    key: "dark",
                    label: t`深色模式`,
                    icon: <Moon className="size-4" />,
                    onClick: () => setTheme("dark"),
                  },
                  {
                    key: "system",
                    label: t`跟随系统`,
                    icon: <SunMoon className="size-4" />,
                    onClick: () => setTheme("system"),
                  },
                ],
                onSelect: (e) => {
                  setTheme(e.key as Theme);
                },
              }}
            >
              {match(theme)
                .with("light", () => {
                  return <Sun className="size-4" />;
                })
                .with("dark", () => {
                  return <Moon className="size-4" />;
                })
                .with("system", () => {
                  return <SunMoon className="size-4" />;
                })
                .exhaustive()}
            </Dropdown>,
          ];
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
