import {
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { ItemInstance, TreeInstance } from "@headless-tree/core";
import { AssistiveTreeDescription } from "@headless-tree/react";
import { Button, Flex, Spin, Typography } from "antd";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { FileTreeItem } from "../../command/fileManager";

type AnimateInnerProps = {
  tree: TreeInstance<FileTreeItem>;
};

export const AnimateInner = ({ tree }: AnimateInnerProps) => {
  return (
    <div
      {...tree.getContainerProps()}
      className="flex flex-col h-full flex-1 overflow-auto gap-1 p-2"
    >
      <AssistiveTreeDescription tree={tree} />
      {tree
        .getRootItem()
        .getChildren()
        .filter((item) => item.getItemData().isDir)
        .map((item) => {
          return <Item key={item.getId()} item={item} />;
        })}
    </div>
  );
};

const Item = ({ item }: { item: ItemInstance<FileTreeItem> }) => {
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
        )}
        onClick={() => {
          item.toggleSelect();
        }}
      >
        <div className="px-2 flex gap-1 overflow-hidden flex-1 items-center group">
          <Button
            variant="text"
            color="default"
            size="small"
            icon={
              <motion.div
                className="flex items-center justify-center"
                animate={{ rotate: item.isExpanded() ? 90 : 0 }}
                transition={{
                  duration: 0.2,
                }}
              >
                <ChevronRight className="w-4" />
              </motion.div>
            }
            onClick={(e) => {
              e.stopPropagation();

              if (item.isExpanded()) {
                item.collapse();
              } else {
                item.expand();
              }
            }}
          />
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
        </div>
      </div>

      {item.isExpanded() && item.getChildren().length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0.5 }}
          animate={{ height: "fit-content", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ ease: "linear" }}
          className="flex flex-col gap-1"
        >
          {item
            .getChildren()
            .filter((item) => item.getItemData().isDir)
            .map((child) => (
              <Item key={child.getId()} item={child} />
            ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
