import {
  FileAddOutlined,
  FolderAddOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { TreeInstance } from "@headless-tree/core";
import { useLingui } from "@lingui/react/macro";
import { create, mkdir } from "@tauri-apps/plugin-fs";
import { App, Button, Tooltip } from "antd";
import { useEffect } from "react";
import { FileTreeItem } from "../../command/fileManager";

type TreeToolbarProps = {
  tree: TreeInstance<FileTreeItem>;
  openDialog: (
    title: string,
    defaultValue: string | undefined,
    action: (value: string) => Promise<void>,
    mode: "rename" | "createFile" | "createFolder" | "delete",
  ) => void;
  parent?: FileTreeItem;
};

export const TreeToolbar = ({ tree, openDialog, parent }: TreeToolbarProps) => {
  const { t } = useLingui();
  const { message } = App.useApp();
  const target = parent ?? {
    path: tree.getRootItem().getId(),
    name: "根目录",
    isDir: true,
  };

  return (
    <div className="flex items-center justify-between border-b border-border w-full px-2 py-1">
      <div>
        <Button color="default" variant="text" icon={<SearchOutlined />} />
      </div>
      <div className="flex items-center gap-1">
        <Tooltip title={t`新建文件`}>
          <Button
            color="default"
            variant="text"
            icon={<FileAddOutlined />}
            onClick={() => {
              openDialog(
                "新建文件",
                target.name,

                async (fileName) => {
                  if (!fileName) return;
                  const filePath = `${target.path}/${fileName}.md`;
                  const file = await create(filePath);
                  await file.close();
                  tree.getItemInstance(target.path)?.invalidateChildrenIds();
                  message.success("文件创建成功");
                },
                "createFile",
              );
            }}
          />
        </Tooltip>

        <Tooltip title={t`新建文件夹`}>
          <Button
            color="default"
            variant="text"
            icon={<FolderAddOutlined />}
            onClick={() => {
              openDialog(
                "新建文件夹",
                target.path,
                async (folderName) => {
                  if (!folderName) return;
                  await mkdir(`${target.path}/${folderName}`);
                  tree.getItemInstance(target.path)?.invalidateChildrenIds();
                  message.success("文件夹创建成功");
                },
                "createFolder",
              );
            }}
          />
        </Tooltip>

        <Tooltip title={t`刷新`}>
          <Button
            color="default"
            variant="text"
            icon={<ReloadOutlined />}
            onClick={() => tree.expandAll()}
          />
        </Tooltip>
      </div>
    </div>
  );
};
