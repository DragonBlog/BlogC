import {
  FileAddOutlined,
  FolderAddOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { TreeInstance } from "@headless-tree/core";
import { useLingui } from "@lingui/react/macro";
import { Button, Tooltip } from "antd";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { FileTreeItem } from "../../command/fileManager";

type TreeToolbarProps = {
  tree: TreeInstance<FileTreeItem>;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
};

export const TreeToolbar = ({
  tree,
  onCreateFile,
  onCreateFolder,
}: TreeToolbarProps) => {
  const { t } = useLingui();
  const [isExpandAll, setIsExpandAll] = useState(false);

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
            onClick={onCreateFile}
          />
        </Tooltip>

        <Tooltip title={t`新建文件夹`}>
          <Button
            color="default"
            variant="text"
            icon={<FolderAddOutlined />}
            onClick={onCreateFolder}
          />
        </Tooltip>

        <Tooltip title={isExpandAll ? t`折叠全部` : t`展开全部`}>
          <Button
            color="default"
            variant="text"
            icon={
              <div className="flex justify-center items-center">
                {isExpandAll ? (
                  <ChevronsDownUp className="w-4" />
                ) : (
                  <ChevronsUpDown className="w-4" />
                )}
              </div>
            }
            onClick={() => {
              if (isExpandAll) {
                tree.collapseAll();
              } else {
                tree.expandAll();
              }
              setIsExpandAll(!isExpandAll);
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
};
