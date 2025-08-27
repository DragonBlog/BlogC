// import { mkdir, remove, rename } from "@tauri-apps/plugin-fs";
import { useAsyncEffect, useMemoizedFn } from "ahooks";
import { Tree, type TreeProps } from "antd";
import { useMemo, useState } from "react";
import {
  type FileTree,
  type FileTreeItem,
  readChildren,
  readFileTree,
} from "../../command/fileManager";
import { useAppStore } from "../../store/useAppStore";

function mapFileTreeToTreeData(data: FileTree): TreeProps["treeData"] {
  return data.map((item) => mapFileTreeItemToDataNode(item));
}

function mapFileTreeItemToDataNode(
  item: FileTree[number],
): Exclude<TreeProps["treeData"], undefined>[0] {
  return {
    title: item.name,
    key: item.path,
    isLeaf: !item.isDir,
    children: item.children
      ? item.children.map(mapFileTreeItemToDataNode)
      : undefined,
  };
}

export const FileTreeSlider = () => {
  const [data, setData] = useState<FileTree>([]);
  const [projectDir] = useAppStore((store) => [store.projectDir]);

  useAsyncEffect(async () => {
    // 读取文件树 （可以临时找个测试目录替换后面的）
    const data = await readFileTree(projectDir || "/Users/yexiyue/test");
    setData(data);
  }, [projectDir]);

  console.log(data);
  const updateData = useMemoizedFn((tree: FileTree, item: FileTreeItem) => {
    tree.map((node) => {
      if (node.path === item.path) {
        node.children = item.children;
      } else if (node.isDir && node.children) {
        node.children = updateData(node.children, item);
      }
      return node;
    });
    return tree;
  });

  const onLoadData = useMemoizedFn<Exclude<TreeProps["loadData"], undefined>>(
    async (node) => {
      const res = await readChildren(node.key as string);
      updateData(data, res);
      setData([...data]);
    },
  );

  const treeData = useMemo(() => mapFileTreeToTreeData(data), [data]);

  return <Tree loadData={onLoadData} treeData={treeData} />;
};
