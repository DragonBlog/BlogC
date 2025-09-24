import type { ProSettings } from "@ant-design/pro-components";
import { ProLayout, SettingDrawer } from "@ant-design/pro-components";
import { useLingui } from "@lingui/react/macro";
import { Avatar, Dropdown } from "antd";
import {
  House,
  Languages,
  Moon,
  Server,
  Settings,
  SquarePen,
  Sun,
  SunMoon,
} from "lucide-react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { match } from "ts-pattern";
import { useConfigStore } from "@/pages/Config/useConfigStore";
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
  const [currentPage] = useConfigStore((store) => [store.currentPage]);

  return (
    <>
      <ProLayout
        location={{
          pathname,
        }}
        collapsedButtonRender={false}
        collapsed
        disableMobile
        route={{
          routes: [
            {
              path: "/",
              key: "/",
              name: t`首页`,
              icon: <House className="size-4" />,
            },
            {
              path: "/content-manager",
              name: t`写作`,
              icon: <SquarePen className="size-4" />,
            },
            {
              path: "/deploy",
              name: t`部署`,
              icon: <Server className="size-4" />,
            },
            {
              path: "/config",
              name: t`设置`,
              icon: <Settings className="size-4" />,
            },
          ],
        }}
        siderWidth={220}
        menuProps={{
          onClick: (e) => {
            setPathname(e.key);
            if (e.key === "/config") {
              navigate(`/config/${currentPage}`);
            } else {
              navigate(e.key);
            }
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
          size: "small",
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
