import { LoadingOutlined } from "@ant-design/icons";
import { Trans, useLingui } from "@lingui/react/macro";
import { MarkdownPlugin } from "@platejs/markdown";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useAsyncEffect, useDebounceFn } from "ahooks";
import { App, Spin, Typography } from "antd";
import { PlateEditor as TPlateEditor, usePlateEditor } from "platejs/react";
import { useRef, useState } from "react";
import { useTreeStore } from "@/components/EditorSide/useTreeStore";
import { EditorTab, useEditorTabsStore } from "@/store/useEditorTabsStore";
import { useAppStore } from "../../store/useAppStore";
import { CreateModal, CreateModalRef } from "../EditorSide/CreateModal";
import { useTocStore } from "../EditorSide/TocSide/useTocStore";
import { getHeadingList } from "../EditorSide/TocSide/util";
import { EditorKit } from "../editor/editor-kit";
import { PlateEditor } from "../editor/plate-editor";

/**
 * 标签页内容组件
 *
 * 负责渲染单个标签页的内容区域
 * 根据标签页类型（文件或空标签页）显示相应的内容
 */
type ItemFileTabProps = {
  /**
   * 标签页数据
   */
  data: EditorTab;
  onChange?: (data: EditorTab) => void;
  onClose?: (data: EditorTab) => void;
};

/**
 * 标签页内容组件
 * @param props - 组件属性
 * @returns JSX 元素
 */
export const ItemFileTab = (props: ItemFileTabProps) => {
  const { data, onChange, onClose } = props;
  const { fileItem } = data;
  const { message } = App.useApp();
  const { t } = useLingui();
  const createModalRef = useRef<CreateModalRef>(null);
  const treeRef = useTreeStore((state) => state.treeRef);
  const [isLoading, setIsLoading] = useState(false);
  const [projectDir] = useAppStore((store) => [store.projectDir]);
  const [activeTabId, selectedItem, setSelectedItem] = useEditorTabsStore(
    (store) => [store.activeTabId, store.selectedItem, store.setSelectedItem],
  );
  const [setHeadingMaps] = useTocStore((store) => [store.setHeadingMaps]);

  const { run } = useDebounceFn(
    (editor: TPlateEditor) => {
      setHeadingMaps(data.id, getHeadingList(editor), (id) => {
        editor
          .getApi(BlockSelectionPlugin)
          .blockSelection.setSelectedIds({ ids: [id] });
      });
    },
    {
      wait: 300,
    },
  );

  const editor = usePlateEditor({
    plugins: EditorKit,
  });

  useAsyncEffect(async () => {
    if (fileItem) {
      setIsLoading(true);
      try {
        const res = await readTextFile(fileItem.path);
        editor.tf.setValue(
          editor.getApi(MarkdownPlugin).markdown.deserialize(res),
        );
        run(editor);
      } catch (error) {
        message.error(t`读取文件失败 ${error}`);
      } finally {
        setIsLoading(false);
      }
    }
  }, [fileItem]);

  if (fileItem) {
    return (
      <div className="w-full h-full flex items-center justify-center flex-col relative">
        {isLoading ? (
          <Spin
            indicator={<LoadingOutlined spin />}
            spinning={isLoading}
            tip={t`正在加载文件...`}
            delay={300}
          >
            <div className="w-30"></div>
          </Spin>
        ) : (
          <PlateEditor
            editor={editor}
            onValueChange={({ editor }) => {
              if (activeTabId === data.id) {
                run(editor);
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <p
        className="text-[16px] cursor-pointer text-primary-active hover:text-primary-hover"
        onClick={async () => {
          if (!treeRef) return;
          try {
            const currentItem = treeRef.getItemInstance(selectedItem);
            const isFolder = currentItem.isFolder();
            const parent = isFolder ? currentItem : currentItem.getParent();
            createModalRef.current?.open({
              type: "createFile",
              folderPath: parent?.getId() || projectDir,
              name: t`未命名.md`,
            });
          } catch (e) {
            message.error(t`创建失败: ${e}`);
          }
        }}
      >
        <Trans>创建新文件</Trans>
      </p>
      <p
        className="text-[16px] cursor-pointer text-primary-active hover:text-primary-hover"
        onClick={() => {
          onClose?.(data);
        }}
      >
        <Trans>关闭标签页</Trans>
      </p>
      <Typography.Text type="secondary">
        <Trans>或者从左侧文件树中选择一个文件进行编辑</Trans>
      </Typography.Text>
      <CreateModal
        ref={createModalRef}
        onRefresh={(parentPath) => {
          if (treeRef) {
            treeRef.getItemInstance(parentPath)?.invalidateChildrenIds();
          }
        }}
        onCreate={(fileItem) => {
          onChange?.({
            ...data,
            fileItem,
            isEdited: true,
          });
          setSelectedItem(fileItem.path);
        }}
      />
    </div>
  );
};
