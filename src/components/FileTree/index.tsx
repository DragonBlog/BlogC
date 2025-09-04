import {
  asyncDataLoaderFeature,
  buildProxiedInstance,
  buildStaticInstance,
  createOnDropHandler,
  dragAndDropFeature,
  expandAllFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  selectionFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { Virtualizer } from "@tanstack/react-virtual";
// import { create, mkdir, remove, rename } from "@tauri-apps/plugin-fs";
import { App, Dropdown } from "antd";
import { useRef, useState } from "react";
import { match } from "ts-pattern";
import { CommandError } from "../../command";
import {
  FileTreeItem,
  moveFileOrFolder,
  readChildren,
} from "../../command/fileManager";
import { useAppStore } from "../../store/useAppStore";
import { AnimateInner } from "./AnimateInner";
import { TreeToolbar } from "./Toolbar";
import { VirtualInner } from "./VirtualInner";

type FileTreeProps = {
  disableToolbar?: boolean;
  virtual?: boolean;
  onClick?: (item: FileTreeItem) => void;
};

export const FileTree = (props: FileTreeProps) => {
  const { disableToolbar, virtual, onClick } = props;
  const [projectDir] = useAppStore((store) => [store.projectDir]);
  const { message } = App.useApp();
  const [current, setCurrent] = useState<FileTreeItem>();
  const virtualizer = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);

  const tree = useTree<FileTreeItem>({
    isItemFolder: (item) => item.getItemData().isDir,
    rootItemId: projectDir || "/Users/yexiyue/test",
    getItemName: (item) => {
      return item.getItemData().name;
    },
    instanceBuilder: virtual ? buildProxiedInstance : buildStaticInstance,
    canReorder: false,
    features: [
      asyncDataLoaderFeature,
      selectionFeature,
      dragAndDropFeature,
      keyboardDragAndDropFeature,
      hotkeysCoreFeature,
      expandAllFeature,
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
    scrollToItem: virtual
      ? (item) => {
          virtualizer.current?.scrollToIndex(item.getItemMeta().index);
        }
      : undefined,
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
      } catch (e) {
        let error = e as CommandError;
        message.error(`移动失败: ${error.message}`);
      }
    },
  });

  const items = match(current)
    .with({ isDir: true }, ({ path }) => {
      return [
        {
          key: "rename",
          label: "重命名",
          onClick: () => {
            console.log("current:", current);
            message.info("暂未实现");
          },
        },
        {
          key: "newFile",
          label: "新建文件",
          onClick: () => {
            console.log("current:", current);
            message.info("暂未实现");
          },
        },
        {
          key: "newFolder",
          label: "新建文件夹",
          onClick: () => {
            console.log("current:", current);
            message.info("暂未实现");
          },
        },
        {
          key: "refresh",
          label: "刷新",
          onClick: () => {
            tree.getItemInstance(path)?.invalidateChildrenIds();
          },
        },
      ];
    })
    .with({ isDir: false }, () => {
      return [
        {
          key: "rename",
          label: "重命名",
          onClick: () => {
            console.log("current:", current);
            message.info("暂未实现");
          },
        },
        {
          key: "delete",
          label: "删除",
          danger: true,
          onClick: () => {
            console.log("current:", current);
            message.info("暂未实现");
          },
        },
      ];
    })
    .otherwise(() => []);

  return (
    <div className="flex flex-col h-full w-full">
      {!disableToolbar && <TreeToolbar tree={tree} />}
      <Dropdown
        menu={{
          items,
        }}
        onOpenChange={(open) => {
          if (!open) {
            setCurrent(undefined);
          }
        }}
        trigger={["contextMenu"]}
      >
        {virtual ? (
          <VirtualInner
            onClick={onClick}
            tree={tree}
            setCurrent={setCurrent}
            ref={virtualizer}
          />
        ) : (
          <AnimateInner onClick={onClick} tree={tree} setCurrent={setCurrent} />
        )}
      </Dropdown>
    </div>
  );
};
