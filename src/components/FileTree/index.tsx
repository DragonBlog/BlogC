import {
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  LoadingOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import {
  asyncDataLoaderFeature,
  createOnDropHandler,
  dragAndDropFeature,
  keyboardDragAndDropFeature,
  selectionFeature,
} from "@headless-tree/core";
import { AssistiveTreeDescription, useTree } from "@headless-tree/react";
// import { create, mkdir, remove, rename } from "@tauri-apps/plugin-fs";
import { App, Button, Flex, Spin, Typography } from "antd";
import clsx from "clsx";
import {
  FileTreeItem,
  moveFileOrFolder,
  readChildren,
} from "../../command/fileManager";
import { useAppStore } from "../../store/useAppStore";

export const FileTree = () => {
  const [projectDir] = useAppStore((store) => [store.projectDir]);
  const { message } = App.useApp();

  const tree = useTree<FileTreeItem>({
    isItemFolder: (item) => item.getItemData().isDir,
    rootItemId: projectDir || "/Users/yexiyue/test",
    getItemName: (item) => {
      return item.getItemData().name;
    },
    canReorder: false,
    features: [
      asyncDataLoaderFeature,
      selectionFeature,
      dragAndDropFeature,
      keyboardDragAndDropFeature,
    ],
    dataLoader: {
      getItem: async (path) => {
        return await readChildren(path);
      },
      getChildrenWithData: async (path) => {
        try {
          const res = await readChildren(path);
          return (
            res.children?.map((item) => {
              return {
                id: item.path,
                data: item,
              };
            }) || []
          );
        } catch (error) {
          message.error(`读取文件夹失败: ${error}`);
          return [];
        }
      },
    },
    canDrag: () => true,
    canDrop: (_items, target) => {
      if (target.item.isFolder()) {
        return true;
      }
      return false;
    },
    indent: 16,
    onDrop: async (items, target) => {
      if (items.some((i) => i.getParent()?.getId() === target.item.getId())) {
        message.warning("已经在当前目录下，无需移动");
        return;
      }

      try {
        await Promise.all(
          items.map((item) =>
            moveFileOrFolder(item.getId(), target.item.getId()),
          ),
        );

        createOnDropHandler<FileTreeItem>((item) => {
          item.invalidateChildrenIds();
        })(items, target);

        message.success("移动成功");
      } catch (error) {
        message.error(`移动失败: ${error}`);
      }
    },
  });

  return (
    <div
      {...tree.getContainerProps()}
      className="flex flex-col h-full flex-1 overflow-auto gap-1"
    >
      <AssistiveTreeDescription tree={tree} />
      {tree.getItems().map((item) => {
        return (
          <div
            {...item.getProps()}
            key={item.getId()}
            style={{
              paddingLeft: `${item.getItemMeta().level * 16}px`,
            }}
            className={clsx(
              "transition rounded-lg h-8 hover:bg-fill-tertiary cursor-pointer flex overflow-hidden items-center shrink-0",
              item.isSelected() && "bg-primary-bg hover:bg-primary-bg",
              item.isDragTarget() && "bg-info-bg-hover",
            )}
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
                >
                  {item.getItemName()}
                </Typography.Text>
              </Flex>
              <Button
                className="opacity-0 group-hover:opacity-100 transition"
                onClick={(e) => {
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
