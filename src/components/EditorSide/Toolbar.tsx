import { SearchOutlined } from "@ant-design/icons";
import { TreeInstance } from "@headless-tree/core";
import { useLingui } from "@lingui/react/macro";
import { Button, Tooltip } from "antd";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  FilePlus2,
  FolderPen,
  FolderPlus,
  FolderTree,
  TableOfContents,
} from "lucide-react";
import { useState } from "react";
import { match } from "ts-pattern";
import { useEditorTabsStore } from "@/store/useEditorTabsStore";
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
  const [selectedItem, sideType, setSideType] = useEditorTabsStore((store) => [
    store.selectedItem,
    store.sideType,
    store.setSideType,
  ]);

  return (
    <div className="flex items-center justify-between border-b border-border w-full px-2 py-1">
      <div className="flex items-center gap-1">
        <Tooltip
          title={sideType === "file" ? t`切换到大纲视图` : t`切换到文件视图`}
        >
          <Button
            color="default"
            variant="text"
            icon={
              <div className="flex justify-center items-center">
                {match(sideType)
                  .with("file", () => <TableOfContents className="size-4" />)
                  .with("toc", () => <FolderTree className="size-4" />)
                  .exhaustive()}
              </div>
            }
            onClick={() => {
              setSideType(sideType === "file" ? "toc" : "file");
            }}
          />
        </Tooltip>

        {sideType === "file" && (
          <Button color="default" variant="text" icon={<SearchOutlined />} />
        )}
      </div>
      {sideType === "file" && (
        <div className="flex items-center gap-1">
          <Tooltip title={t`新建文件`}>
            <Button
              color="default"
              variant="text"
              icon={
                <div className="flex justify-center items-center">
                  <FilePlus2 className="size-4" />
                </div>
              }
              onClick={onCreateFile}
            />
          </Tooltip>

          <Tooltip title={t`新建文件夹`}>
            <Button
              color="default"
              variant="text"
              icon={
                <div className="flex justify-center items-center">
                  <FolderPlus className="size-4" />
                </div>
              }
              onClick={onCreateFolder}
            />
          </Tooltip>

          <Tooltip title={t`重命名`}>
            <Button
              color="default"
              variant="text"
              icon={
                <div className="flex justify-center items-center">
                  <FolderPen className="size-4" />
                </div>
              }
              disabled={!selectedItem}
              onClick={() => {
                if (selectedItem) {
                  console.log(tree.getItemInstance(selectedItem));
                  tree.getItemInstance(selectedItem)?.startRenaming();
                }
              }}
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
      )}
    </div>
  );
};
