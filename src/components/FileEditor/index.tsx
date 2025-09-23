import { useLingui } from "@lingui/react/macro";
import { useMemoizedFn } from "ahooks";
import { Tabs } from "antd";
import { PlateEditor } from "platejs/react";
import { useEffect, useMemo, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { v4 } from "uuid";
import { FileTreeItem } from "@/command/fileManager";
import { EditorTab, useEditorTabsStore } from "@/store/useEditorTabsStore";
import { ItemFileTab } from "./ItemTab";
import styles from "./index.module.less";

/**
 * 文件编辑器组件
 *
 * 提供标签页式的文件编辑界面，支持：
 * - 打开多个文件标签页
 * - 动态添加/删除标签页
 * - 标签页状态管理
 */
export const FileEditor = () => {
  const [
    tabs,
    activeTabId,
    setActiveTabId,
    setTabs,
    setSelectedItem,
    setCurrentMonitorEditor,
  ] = useEditorTabsStore((store) => [
    store.tabs,
    store.activeTabId,
    store.setActiveTabId,
    store.setTabs,
    store.setSelectedItem,
    store.setCurrentMonitorEditor,
  ]);

  const editors = useRef<Record<string, PlateEditor>>({});

  const { t } = useLingui();

  /**
   * 添加新的标签页
   * @param fileItem - 可选的文件项，如果提供则标签页与该文件关联
   */
  const add = useMemoizedFn((fileItem?: FileTreeItem) => {
    const newTab: EditorTab = {
      id: v4(),
      fileItem,
    };

    setActiveTabId(newTab.id);
    setTabs([...tabs, newTab]);
  });

  /**
   * 移除指定标签页
   * @param targetKey - 要移除的标签页 ID
   */
  const remove = useMemoizedFn((targetKey: string) => {
    let newActiveKey = activeTabId;
    let lastIndex = -1;

    // 查找要删除标签页的前一个标签页索引
    tabs.forEach((tab, i) => {
      if (tab.id === targetKey) {
        lastIndex = i - 1;
      }
    });

    // 过滤掉要删除的标签页
    const newTabs = tabs.filter((tab) => tab.id !== targetKey);

    // 设置新的激活标签页
    if (newTabs.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newTabs[lastIndex].id;
      } else {
        newActiveKey = newTabs[0].id;
      }
    } else if (newTabs.length === 0) {
      // 如果没有标签页了，创建一个新的空标签页
      const newTab: EditorTab = {
        id: v4(),
      };
      newTabs.push(newTab);
      newActiveKey = newTab.id;
    }

    setTabs(newTabs);
    setActiveTabId(newActiveKey);
  });

  /**
   * 构建标签页项列表
   */
  const items = useMemo(() => {
    const items = tabs.map((tab) => {
      return {
        key: tab.id,
        label: tab.fileItem?.name || t`新标签页`,
        children: (
          <ItemFileTab
            key={tab.id}
            data={tab}
            onClose={() => remove(tab.id)}
            onChange={(data) => {
              const newTabs = tabs.map((i) => (i.id === data.id ? data : i));
              setTabs(newTabs);
            }}
            ref={(ref) => {
              if (ref) {
                editors.current[tab.id] = ref;
              }
              return () => {
                delete editors.current[tab.id];
              };
            }}
          />
        ),
      };
    });

    // 如果没有标签页，则创建一个默认标签页
    if (items.length === 0) {
      const newTab: EditorTab = {
        id: v4(),
      };
      items.push({
        key: newTab.id,
        label: t`新标签页`,
        children: (
          <ItemFileTab
            key={newTab.id}
            data={newTab}
            onClose={() => remove(newTab.id)}
            onChange={(data) => {
              const newTabs = tabs.map((i) => (i.id === data.id ? data : i));
              setTabs(newTabs);
            }}
            ref={(ref) => {
              if (ref) {
                editors.current[newTab.id] = ref;
              }
              return () => {
                delete editors.current[newTab.id];
              };
            }}
          />
        ),
      });
      setActiveTabId(newTab.id);
    }
    return items;
  }, [t, tabs, setActiveTabId]);

  useEffect(() => {
    // 监听标签页激活事件，并更新当前监控的编辑器
    setCurrentMonitorEditor(editors.current[activeTabId]);
  }, [activeTabId, setCurrentMonitorEditor]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Tabs
        type="editable-card"
        items={items}
        activeKey={activeTabId}
        onChange={(key) => {
          const current = tabs.find((tab) => tab.id === key);
          if (current?.fileItem) {
            setSelectedItem(current.fileItem.path);
          }
          setActiveTabId(key);
        }}
        onEdit={(e, type) => {
          if (type === "remove") {
            remove(e as string);
          } else {
            add();
          }
        }}
        className={styles.tabs}
      />
    </DndProvider>
  );
};
