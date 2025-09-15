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
import { openPath } from "@tauri-apps/plugin-opener";
import { type } from "@tauri-apps/plugin-os";
import { App, Dropdown } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // 提取 openInFolder 逻辑
  const handleOpenInFolder = useCallback(
    async (path: string) => {
      const parent = tree.getItemInstance(path)?.getParent();
      const parentPath = parent?.getId() || projectDir;
      const osType = type();
      await match(osType)
        .with("macos", async () => {
          await openPath(parentPath, "finder");
        })
        .with("windows", async () => {
          await openPath(parentPath, "explorer");
        })
        .with("linux", async () => {
          await openPath(parentPath, "xdg-open");
        })
        .otherwise(() => {
          message.error(t`当前系统不支持此功能`);
        });
    },
    [tree, projectDir, message, t],
  );

  // 菜单项生成函数
  const getMenuItems = useCallback(
    (item?: FileTreeItem) => {
      if (!item) return [];
      const { path, name, isDir } = item;
      const common = [
        {
          key: "rename",
          label: t`重命名`,
          onClick: async () => {
            tree.getItemInstance(path)?.startRenaming();
          },
        },
        {
          key: "copy",
          label: t`复制`,
          onClick: async () => {
            const parent = tree.getItemInstance(path)?.getParent();
            const copyName = isDir
              ? `${name} Copy`
              : (() => {
                  const names = name.split(".");
                  return `${names.slice(0, -1).join(".")} Copy.${names.at(-1)}`;
                })();
            createModalRef.current?.open({
              type: "copy",
              folderPath: parent?.getId() || "",
              name: copyName,
              path,
            });
          },
        },
        {
          key: "move",
          label: t`移动`,
          onClick: async () => {
            const parent = tree.getItemInstance(path)?.getParent();
            createModalRef.current?.open({
              type: "move",
              folderPath: parent?.getId() || "",
              name,
              path,
            });
          },
        },
        {
          key: "openInFolder",
          label: match(type())
            .with("windows", () => t`在文件夹中打开`)
            .with("macos", () => t`在访达中显示`)
            .with("linux", () => t`在文件管理器中打开`)
            .otherwise(() => t`在文件夹中显示`),
          onClick: async () => {
            await handleOpenInFolder(path);
          },
        },
        {
          key: "delete",
          label: t`删除`,
          danger: true,
          onClick: async () => {
            modal.confirm({
              title: isDir ? t`删除文件夹` : t`删除文件`,
              content: isDir
                ? t`确定要删除文件夹 ${name} 吗？子文件夹和文件也会被删除，此操作不可撤销。`
                : t`确定要删除文件 ${name} 吗？此操作不可撤销。`,
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
      ];
      if (isDir) {
        return [
          {
            key: "newFile",
            label: t`新建文件`,
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
            label: t`新建文件夹`,
            onClick: async () => {
              createModalRef.current?.open({
                type: "createFolder",
                folderPath: path.replace(/\\/g, "/"),
                name: t`未命名`,
              });
            },
          },
          ...common,
        ];
      }
      return common;
    },
    [tree, t, modal, message, handleOpenInFolder],
  );

  const items = useMemo(() => getMenuItems(current), [current, getMenuItems]);

  // 新建文件/文件夹逻辑合并
  const handleCreate = useCallback(
    async (type: "createFile" | "createFolder") => {
      try {
        const currentItem = tree.getItemInstance(selectedItem);
        const isFolder = currentItem.isFolder();
        const parent = isFolder ? currentItem : currentItem.getParent();
        createModalRef.current?.open({
          type,
          folderPath: parent?.getId() || projectDir,
          name: type === "createFile" ? t`未命名.md` : t`未命名`,
        });
      } catch (e) {
        message.error(t`创建失败: ${e}`);
      }
    },
    [tree, selectedItem, projectDir, t, message],
  );

  return (
    <div className="flex flex-col h-full w-full">
      {!disableToolbar && (
        <TreeToolbar
          tree={tree}
          onCreateFolder={() => handleCreate("createFolder")}
          onCreateFile={() => handleCreate("createFile")}
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
      <CreateModal
        ref={createModalRef}
        onRefresh={(parentPath) => {
          tree.getItemInstance(parentPath)?.invalidateChildrenIds();
        }}
      />
    </div>
  );
};
