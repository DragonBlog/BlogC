import {
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LoadingOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { TreeInstance } from "@headless-tree/core";
import { useVirtualizer, Virtualizer } from "@tanstack/react-virtual";
import { Button, Flex, Spin, Typography } from "antd";
import clsx from "clsx";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { FileTreeItem } from "../../command/fileManager";

type VirtualInnerProps = {
  tree: TreeInstance<FileTreeItem>;
  setCurrent: (item: FileTreeItem) => void;
};

export const VirtualInner = forwardRef<
  Virtualizer<HTMLDivElement, Element>,
  VirtualInnerProps
>(({ tree, setCurrent }, ref) => {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: tree.getItems().length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
  });

  useImperativeHandle(ref, () => virtualizer);

  return (
    <div ref={parentRef} className="p-2 flex-1 overflow-auto">
      <div
        {...tree.getContainerProps()}
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
        className="flex flex-col w-full overflow-hidden gap-1 relative"
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = tree.getItems()[virtualItem.index];
          return (
            <div
              {...item.getProps()}
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
    </div>
  );
});
