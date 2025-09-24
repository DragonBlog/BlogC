import { useLingui } from "@lingui/react/macro";
import { GetProp, Menu, MenuProps } from "antd";
import { FolderCog, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConfigStore } from "./useConfigStore";

type MenuItem = GetProp<MenuProps, "items">[number];
export const MenuSide = () => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const location = useLocation();
  const [setCurrentPage] = useConfigStore((store) => [store.setCurrentPage]);
  const items: MenuItem[] = [
    {
      key: "general-setting",
      icon: <Settings className="size-4" />,
      label: t`常规设置`,
    },
    {
      type: "divider",
    },
    {
      key: "file-setting",
      icon: <FolderCog className="size-4" />,
      label: t`文件管理`,
    },
  ];

  return (
    <Menu
      className="bg-transparent! h-full overflow-y-auto px-2! py-4! w-3xs!"
      mode="vertical"
      items={items}
      selectable
      selectedKeys={[location.pathname.split("/").pop() || ""]}
      onSelect={({ key }) => {
        navigate(`/config/${key}`);
        setCurrentPage(key);
      }}
    />
  );
};
