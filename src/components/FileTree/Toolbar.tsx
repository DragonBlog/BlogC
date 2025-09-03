import {
  FileAddOutlined,
  FolderAddOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { TreeInstance } from "@headless-tree/core";
import { Button, Tooltip } from "antd";
import { FileTreeItem } from "../../command/fileManager";

type TreeToolbarProps = {
  tree: TreeInstance<FileTreeItem>;
};

export const TreeToolbar = ({ tree }: TreeToolbarProps) => {
  console.log(tree.getHotkeyPresets());
  return (
    <div className="flex items-center justify-between border-b border-border w-full px-2 py-1">
      <div>
        <Button color="default" variant="text" icon={<SearchOutlined />} />
      </div>
      <div className="flex items-center gap-1">
        <Tooltip title="新建文件">
          <Button color="default" variant="text" icon={<FileAddOutlined />} />
        </Tooltip>
        <Tooltip title="新建文件夹">
          <Button color="default" variant="text" icon={<FolderAddOutlined />} />
        </Tooltip>
        <Tooltip title="刷新">
          <Button
            color="default"
            variant="text"
            icon={<ReloadOutlined />}
            onClick={() => {
              tree.expandAll();
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
};
