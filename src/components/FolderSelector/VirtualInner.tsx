import {
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { TreeInstance } from "@headless-tree/core";
import { AssistiveTreeDescription } from "@headless-tree/react";
import { useVirtualizer, Virtualizer } from "@tanstack/react-virtual";
import { Button, Flex, Spin, Typography } from "antd";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { FileTreeItem } from "../../command/fileManager";

type VirtualInnerProps = {
  tree: TreeInstance<FileTreeItem>;
};

export const VirtualInner = forwardRef<
  Virtualizer<HTMLDivElement, Element>,
  VirtualInnerProps
>(({ tree }, ref) => {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const filterItems = tree
    .getItems()
    .filter((item) => item.getItemData().isDir);

  const virtualizer = useVirtualizer({
    count: filterItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
  });

  useImperativeHandle(ref, () => virtualizer);

  return (
    <div ref={parentRef} className="p-2 flex-1 overflow-auto">
      <AssistiveTreeDescription tree={tree} />
      <div
        {...tree.getContainerProps()}
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        className="flex flex-col w-full overflow-hidden gap-1 relative"
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = filterItems[virtualItem.index];
          const itemProps = item.getProps();

          return (
            <div
              {...itemProps}
              key={item.getId()}
              style={{
                paddingLeft: `${item.getItemMeta().level * 16}px`,
                height: 32,
                transform: `translateY(${virtualItem.start}px)`,
                position: "absolute",
              }}
              className={clsx(
                "w-full transition rounded-lg hover:bg-fill-tertiary cursor-pointer flex overflow-hidden items-center shrink-0",
                item.isSelected() &&
                  "bg-primary-bg hover:bg-primary-bg text-primary",
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
                      initial={{ rotate: item.isExpanded() ? 90 : 0 }}
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
          );
        })}
      </div>
    </div>
  );
});
