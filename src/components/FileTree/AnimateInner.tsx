import {
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LoadingOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { TreeInstance } from "@headless-tree/core";
import { AssistiveTreeDescription } from "@headless-tree/react";
import { Button, Flex, Spin, Typography } from "antd";
import clsx from "clsx";
import { FileTreeItem } from "../../command/fileManager";

type AnimateInnerProps = {
  tree: TreeInstance<FileTreeItem>;
  setCurrent: (item: FileTreeItem) => void;
};

export const AnimateInner = ({ tree, setCurrent }: AnimateInnerProps) => {
  return (
    <div
      {...tree.getContainerProps()}
      className="flex flex-col h-full flex-1 overflow-auto gap-1 p-2"
    >
      <AssistiveTreeDescription tree={tree} />
      {tree.getItems().map((item) => {
        return (
          <div
            {...item.getProps()}
            key={item.getId()}
            style={{
              paddingLeft: `${item.getItemMeta().level * 16}px`,
              height: 32,
            }}
            className={clsx(
              "transition rounded-lg hover:bg-fill-tertiary cursor-pointer flex overflow-hidden items-center shrink-0",
              item.isSelected() &&
                "bg-primary-bg hover:bg-primary-bg text-primary",
              item.isDragTarget() && "bg-info-bg-hover",
            )}
            onContextMenu={() => {
              setCurrent(item.getItemData());
            }}
          >
            <div className="px-2 flex gap-1 overflow-hidden flex-1 items-center group">
              <Flex flex={1} align="center" className="gap-1 overflow-hidden">
                <Spin
                  indicator={<LoadingOutlined />}
                  size="small"
                  delay={300}
                  spinning={item.isLoading()}
                >
                  {item.isFolder() ? (
                    item.isExpanded() ? (
                      <FolderOpenOutlined />
                    ) : (
                      <FolderOutlined />
                    )
                  ) : (
                    <FileOutlined />
                  )}
                </Spin>

                <Typography.Text
                  ellipsis={{
                    tooltip: true,
                  }}
                  style={{
                    color: "inherit",
                  }}
                  className={clsx(item.isSelected() && "text-primary")}
                >
                  {item.getItemName()}
                </Typography.Text>
              </Flex>
              <Button
                className="opacity-0 group-hover:opacity-100 transition"
                onClick={(e) => {
                  setCurrent(item.getItemData());
                  e.stopPropagation();
                  e.target.dispatchEvent(
                    new MouseEvent("contextmenu", {
                      bubbles: true,
                      clientX: e.clientX,
                      clientY: e.clientY,
                    }),
                  );
                }}
                icon={<MoreOutlined />}
                type="text"
                size="small"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
