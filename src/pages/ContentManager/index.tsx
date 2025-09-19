import { useMemoizedFn } from "ahooks";
import { Flex, Splitter } from "antd";
import { useState } from "react";
import { v4 } from "uuid";
import { FileTreeItem } from "@/command/fileManager";
import { FileEditor } from "@/components/FileEditor";
import { EditorTab, useEditorTabsStore } from "@/store/useEditorTabsStore";
import { FileTree } from "../../components/FileTree";

export const ContentManager = () => {
  const [tabs, activeTabId, setTabs, setActiveTabId] = useEditorTabsStore(
    (store) => [
      store.tabs,
      store.activeTabId,
      store.setTabs,
      store.setActiveTabId,
    ],
  );

  const [sizes, setSizes] = useState<(number | string)[]>([300, "100%"]);

  /** 逻辑说明：
    - 优先复用当前 tab，避免无编辑时产生多余 tab。
    - 仅在当前 tab 有编辑内容时才新建 tab，保证编辑安全。
    - 已打开文件直接切换，无需重复打开。
  */
  const handleTreeItemClick = useMemoizedFn((item: FileTreeItem) => {
    // 只处理文件点击，文件夹直接返回
    if (item.isDir) return;

    // 1. 检查该文件是否已在标签页中打开
    const existingTab = tabs.find(
      (tab) => tab.fileItem && tab.fileItem.path === item.path,
    );

    if (existingTab) {
      // 已打开则直接切换到该标签页
      setActiveTabId(existingTab.id);
    } else {
      // 未打开时，判断当前激活 tab 是否有编辑内容
      const currentTab = tabs.find((tab) => tab.id === activeTabId);
      // 如果没有当前 tab（理论上不会发生，保险处理）
      if (!currentTab) return;
      // 2. 当前 tab 未编辑，直接复用 tab 替换 fileItem
      if (!currentTab.isEdited) {
        const updatedTabs = tabs.map((tab) =>
          tab.id === currentTab.id ? { ...tab, fileItem: item } : tab,
        );
        setTabs(updatedTabs);
        // 保持当前 tab 激活
      } else {
        // 3. 当前 tab 有编辑内容，新建标签页并激活
        const newTab: EditorTab = {
          id: v4(),
          fileItem: item,
        };
        setTabs([...tabs, newTab]);
        setActiveTabId(newTab.id);
      }
    }
  });

  return (
    <Splitter onResize={setSizes} style={{ height: "100%", width: "100%" }}>
      <Splitter.Panel
        size={sizes[0]}
        defaultSize={300}
        min={240}
        max="50%"
        collapsible={{
          start: true,
          end: true,
          showCollapsibleIcon: (sizes[0] as number) < 240 ? true : "auto",
        }}
      >
        <FileTree onClick={handleTreeItemClick} />
      </Splitter.Panel>
      <Splitter.Panel size={sizes[1]}>
        <FileEditor />
      </Splitter.Panel>
    </Splitter>
  );
};
