import {
  asyncDataLoaderFeature,
  buildProxiedInstance,
  buildStaticInstance,
  expandAllFeature,
  hotkeysCoreFeature,
  selectionFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { useLingui } from "@lingui/react/macro";
import { Virtualizer } from "@tanstack/react-virtual";
import { useControllableValue } from "ahooks";
import { App } from "antd";
import clsx from "clsx";
import { useRef } from "react";
import { FileTreeItem, readChildren } from "@/command/fileManager";
import { AnimateInner } from "./AnimateInner";
import { VirtualInner } from "./VirtualInner";

type TreeSelectorProps = {
  rootPath: string;
  virtual?: boolean;
  className?: string;
  value?: string;
  onChange?: (path: string) => void;
};

export const FolderSelector = (props: TreeSelectorProps) => {
  const { rootPath, virtual, className } = props;
  const { message } = App.useApp();
  const virtualizer = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);
  const { t } = useLingui();
  const [value, setValue] = useControllableValue<string>(props);

  const tree = useTree<FileTreeItem>({
    isItemFolder: (item) => item.getItemData().isDir,
    rootItemId: rootPath,
    getItemName: (item) => {
      return item.getItemData().name;
    },
    state: {
      selectedItems: [value],
    },
    setSelectedItems: (items) => {
      setValue((items as string[]).at(-1) || rootPath);
    },
    instanceBuilder: virtual ? buildProxiedInstance : buildStaticInstance,
    canReorder: false,
    features: [
      asyncDataLoaderFeature,
      selectionFeature,
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
          message.error(t`读取文件夹失败: ${(error as Error).message}`);
          return [];
        }
      },
    },
    indent: 16,
    scrollToItem: virtual
      ? (item) => {
          virtualizer.current?.scrollToIndex(item.getItemMeta().index);
        }
      : undefined,
  });

  return (
    <div className={clsx("flex overflow-hidden", className)}>
      {virtual ? (
        <VirtualInner tree={tree} ref={virtualizer} />
      ) : (
        <AnimateInner tree={tree} />
      )}
    </div>
  );
};
