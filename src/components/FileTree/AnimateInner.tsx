import {
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LoadingOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { ItemInstance, TreeInstance } from "@headless-tree/core";
import { AssistiveTreeDescription } from "@headless-tree/react";
import { Button, Dropdown, Flex, Spin, Typography } from "antd";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { FileTreeItem } from "../../command/fileManager";

type AnimateInnerProps = {
  tree: TreeInstance<FileTreeItem>;
  setCurrent: (item: FileTreeItem) => void;
  onClick?: (item: FileTreeItem) => void;
};

export const AnimateInner = ({
  tree,
  setCurrent,
  onClick,
}: AnimateInnerProps) => {
  return (
    <div
      {...tree.getContainerProps()}
      className="flex flex-col h-full flex-1 overflow-auto gap-1 p-2"
    >
      <AssistiveTreeDescription tree={tree} />
      {tree
        .getRootItem()
        .getChildren()
        .map((item) => {
          return (
            <Item
              key={item.getId()}
              onClick={onClick}
              item={item}
              setCurrent={setCurrent}
            />
          );
        })}
    </div>
  );
};

const Item = ({
  item,
  setCurrent,
  onClick,
}: {
  item: ItemInstance<FileTreeItem>;
  setCurrent: (item: FileTreeItem) => void;
  onClick?: (item: FileTreeItem) => void;
}) => {
  const itemProps = item.getProps();

  return (
    <AnimatePresence>
      <div
        {...itemProps}
        key={item.getId()}
        style={{
          paddingLeft: `${item.getItemMeta().level * 16}px`,
          height: 32,
          overflow: "hidden",
        }}
        className={clsx(
          "transition rounded-lg hover:bg-fill-tertiary cursor-pointer flex overflow-hidden items-center shrink-0",
          item.isSelected() && "bg-primary-bg hover:bg-primary-bg text-primary",
          item.isDragTarget() && "bg-info-bg-hover",
        )}
        onClick={(e) => {
          itemProps.onClick?.(e);
          onClick?.(item.getItemData());
        }}
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
              ellipsis={{ tooltip: true }}
              style={{ color: "inherit" }}
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

      {item.isExpanded() && item.getChildren().length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0.5 }}
          animate={{ height: "fit-content", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ ease: "linear" }}
        >
          {item.getChildren().map((child) => (
            <Item
              key={child.getId()}
              onClick={onClick}
              item={child}
              setCurrent={setCurrent}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
