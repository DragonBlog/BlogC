import {
  asyncDataLoaderFeature,
  buildProxiedInstance,
  buildStaticInstance,
  createOnDropHandler,
  dragAndDropFeature,
  expandAllFeature,
  hotkeysCoreFeature,
  keyboardDragAndDropFeature,
  renamingFeature,
  selectionFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { useLingui } from "@lingui/react/macro";
import { Virtualizer } from "@tanstack/react-virtual";
import { remove } from "@tauri-apps/plugin-fs";
import { App, Dropdown } from "antd";
import { useEffect, useRef, useState } from "react";
import { match } from "ts-pattern";
import { useEditorTabsStore } from "@/store/useEditorTabsStore";
import { CommandError } from "../../command";
import {
  FileTreeItem,
  moveFileOrFolder,
  readChildren,
  rename,
  watchDir,
} from "../../command/fileManager";
import { useAppStore } from "../../store/useAppStore";
import { AnimateInner } from "./AnimateInner";
import { CreateModal, CreateModalRef } from "./CreateModal";
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

  const [selectedItem, setSelectedItem] = useEditorTabsStore((store) => [
    store.selectedItem,
    store.setSelectedItem,
  ]);

  const { message, modal } = App.useApp();
  const [current, setCurrent] = useState<FileTreeItem>();
  const virtualizer = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);
  const { t } = useLingui();

  const createModalRef = useRef<CreateModalRef>(null);

  useEffect(() => {
    watchDir(projectDir).catch((e) => {
      console.error("watchDir error", e);
      message.error(t`监视文件夹失败: ${e}`);
    });
  }, []);

  const tree = useTree<FileTreeItem>({
    isItemFolder: (item) => item.getItemData().isDir,
    rootItemId: projectDir,
    getItemName: (item) => {
      return item.getItemData().name;
    },
    state: { selectedItems: [selectedItem] },
    setSelectedItems: (items) => {
      const path = (items as string[]).at(-1) || "";
      setSelectedItem(path);
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
      renamingFeature,
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
          message.error(t`读取文件夹失败: ${(error as Error).message}`);
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
        message.warning(t`已经在当前目录下，无需移动`);
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

        message.success(t`移动成功`);
      } catch (e) {
        let error = e as CommandError;
        message.error(t`移动失败: ${error.message}`);
      }
    },
    onRename: async (item, value) => {
      if (!value) {
        message.warning(t`名称不能为空`);
        return;
      }
      if (item.getItemName() === value) {
        return;
      }

      try {
        await rename(item.getId(), value);
        item.getParent()?.invalidateChildrenIds();
        message.success(t`重命名成功`);
      } catch (error) {
        message.error(t`重命名失败: ${(error as Error).message}`);
      }
    },
  });

  const items = match(current)
    .with({ isDir: true }, ({ path, name }) => [
      {
        key: "rename",
        label: "重命名",
        onClick: async () => {
          tree.getItemInstance(path)?.startRenaming();
        },
      },
      {
        key: "newFile",
        label: "新建文件",
        onClick: async () => {
          createModalRef.current?.open({
            type: "createFile",
            folderPath: path,
            name: t`未命名.md`,
          });
        },
      },
      {
        key: "newFolder",
        label: "新建文件夹",
        onClick: async () => {
          createModalRef.current?.open({
            type: "createFolder",
            folderPath: path,
            name: t`未命名`,
          });
        },
      },
      {
        key: "copy",
        label: "复制",
        onClick: async () => {
          const parent = tree.getItemInstance(path)?.getParent();
          createModalRef.current?.open({
            type: "copy",
            folderPath: parent?.getId() || "",
            name: `${name} Copy`,
            path,
          });
        },
      },
      {
        key: "refresh",
        label: "刷新",
        onClick: () => {
          tree.getItemInstance(path)?.invalidateChildrenIds();
        },
      },
      {
        key: "delete",
        label: "删除",
        danger: true,
        onClick: async () => {
          modal.confirm({
            title: t`删除文件夹`,
            content: t`确定要删除文件夹 ${name} 吗？子文件夹和文件也会被删除，此操作不可撤销。`,
            okType: "danger",
            onOk: async () => {
              try {
                await remove(path, { recursive: true });
                tree
                  .getItemInstance(path)
                  ?.getParent()
                  ?.invalidateChildrenIds();
                message.success(t`删除成功`);
              } catch (e) {
                message.error(t`删除失败`);
              }
            },
          });
        },
      },
    ])
    .with({ isDir: false }, ({ path, name }) => [
      {
        key: "rename",
        label: "重命名",
        onClick: async () => {
          tree.getItemInstance(path)?.startRenaming();
        },
      },
      {
        key: "copy",
        label: "复制",
        onClick: async () => {
          const parent = tree.getItemInstance(path)?.getParent();
          const names = name.split(".");

          createModalRef.current?.open({
            type: "copy",
            folderPath: parent?.getId() || "",
            name: `${names.slice(0, -1).join(".")} Copy.${names.at(-1)}`,
            path,
          });
        },
      },
      {
        key: "move",
        label: "移动",
        onClick: async () => {
          // tree.getItemInstance(path)?.startRenaming();
        },
      },
      {
        key: "delete",
        label: "删除",
        danger: true,
        onClick: async () => {
          modal.confirm({
            title: t`删除文件`,
            content: t`确定要删除文件 ${name} 吗？此操作不可撤销。`,
            okType: "danger",
            onOk: async () => {
              try {
                await remove(path, { recursive: true });
                tree
                  .getItemInstance(path)
                  ?.getParent()
                  ?.invalidateChildrenIds();
                message.success(t`删除成功`);
              } catch (e) {
                message.error(t`删除失败: ${e}`);
              }
            },
          });
        },
      },
    ])
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
        <div className="flex flex-1 overflow-hidden">
          {virtual ? (
            <VirtualInner
              onClick={onClick}
              tree={tree}
              setCurrent={setCurrent}
              ref={virtualizer}
            />
          ) : (
            <AnimateInner
              onClick={onClick}
              tree={tree}
              setCurrent={setCurrent}
            />
          )}
        </div>
      </Dropdown>
      <CreateModal ref={createModalRef} />
    </div>
  );
};
