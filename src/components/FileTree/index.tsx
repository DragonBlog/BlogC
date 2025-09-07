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
import { create, mkdir, remove, rename } from "@tauri-apps/plugin-fs";
import { App, Dropdown } from "antd";
// @ts-ignore
import PathBrowerify from "path-browserify";
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
import { FileTreeDialog } from "./FileTreeDialog";
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
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    defaultValue?: string;
    mode?: "rename" | "createFile" | "createFolder" | "delete";
    action?: (value: string) => Promise<void>;
  }>({ open: false, title: "" });

  const openDialog = (
    title: string,
    defaultValue: string | undefined,
    action: (value: string) => Promise<void>,
    mode: "rename" | "createFile" | "createFolder" | "delete",
  ) => {
    setDialog({ open: true, title, defaultValue, action, mode });
  };

  const closeDialog = () => {
    setDialog({ ...dialog, open: false });
  };

  const handleOk = async (value: string) => {
    if (dialog.action) {
      await dialog.action(value);
    }
    setDialog({ ...dialog, open: false });
  };

  const tree = useTree<FileTreeItem>({
    isItemFolder: (item) => item.getItemData().isDir,
    rootItemId: projectDir || "E:/test",
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
    .with({ isDir: true }, ({ path }) => [
      {
        key: "rename",
        label: "重命名",
        onClick: async () => {
          try {
            openDialog(
              "重命名文件夹",
              current?.name,
              async (newName) => {
                const parentDir = PathBrowerify.dirname(path);
                const newPath = PathBrowerify.join(parentDir, newName);
                await rename(parentDir, newPath);
                tree
                  .getItemInstance(path)
                  ?.getParent()
                  ?.invalidateChildrenIds();
                message.success("重命名成功");
              },
              "rename",
            );
          } catch (e) {
            message.error(`重命名失败: ${(e as Error).message}`);
          }
        },
      },
      {
        key: "newFile",
        label: "新建文件",
        onClick: async () => {
          try {
            openDialog(
              "新建文件",
              current?.name,
              async (fileName) => {
                if (!fileName) return;

                const filePath = `${path}/${fileName}.md`;
                const file = await create(filePath);
                await file.close();
                tree.getItemInstance(path)?.invalidateChildrenIds();
                message.success("文件创建成功");
              },
              "createFile",
            );
          } catch (e) {
            message.error(`文件创建失败: ${(e as Error).message}`);
          }
        },
      },
      {
        key: "newFolder",
        label: "新建文件夹",
        onClick: async () => {
          try {
            openDialog(
              "新建文件夹",
              current?.name,
              async (folderName) => {
                if (!folderName) return;
                await mkdir(`${path}/${folderName}`);
                tree.getItemInstance(path)?.invalidateChildrenIds();
                message.success("文件夹创建成功");
              },
              "createFolder",
            );
          } catch (e) {
            message.error(`新建文件夹失败: ${(e as Error).message}`);
          }
        },
      },
      {
        key: "refresh",
        label: "刷新",
        onClick: () => {
          tree.getItemInstance(path)?.invalidateChildrenIds();
        },
      },
    ])
    .with({ isDir: false }, ({ path }) => [
      {
        key: "rename",
        label: "重命名",
        onClick: async () => {
          try {
            openDialog(
              "重命名文件",
              current?.name,
              async (newName) => {
                await rename(path, `${path}/../${newName}`);
                tree
                  .getItemInstance(path)
                  ?.getParent()
                  ?.invalidateChildrenIds();
                message.success("重命名成功");
              },
              "rename",
            );
          } catch (e) {
            message.error(`重命名失败: ${(e as Error).message}`);
          }
        },
      },
      {
        key: "delete",
        label: "删除",
        danger: true,
        onClick: async () => {
          try {
            openDialog(
              "删除文件",
              current?.name,
              async () => {
                await remove(path, { recursive: true });
                tree
                  .getItemInstance(path)
                  ?.getParent()
                  ?.invalidateChildrenIds();
                message.success("删除成功");
              },
              "delete",
            );
          } catch (e) {
            message.error(`删除失败: ${(e as Error).message}`);
          }
        },
      },
    ])
    .otherwise(() => []);

  return (
    <div className="flex flex-col h-full w-full">
      {!disableToolbar && (
        <TreeToolbar
          tree={tree}
          openDialog={openDialog}
          projectDir={projectDir}
        />
      )}
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
        <div>
          {virtual ? (
            <VirtualInner
              onClick={onClick}
              tree={tree}
              setCurrent={setCurrent}
              ref={virtualizer}
              items={items}
            />
          ) : (
            <AnimateInner
              onClick={onClick}
              tree={tree}
              setCurrent={setCurrent}
              items={items}
            />
          )}
        </div>
      </Dropdown>
      <FileTreeDialog
        open={dialog.open}
        title={dialog.title}
        defaultValue={dialog.defaultValue}
        onOk={handleOk}
        mode={dialog.mode}
        onCancel={closeDialog}
      />
    </div>
  );
};
