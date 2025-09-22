import { LoadingOutlined } from "@ant-design/icons";
import { Trans, useLingui } from "@lingui/react/macro";
import { MarkdownPlugin } from "@platejs/markdown";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useAsyncEffect, useDebounceFn } from "ahooks";
import { App, Spin, Typography } from "antd";
import { PlateEditor as TPlateEditor, usePlateEditor } from "platejs/react";
import { Ref, useImperativeHandle, useState } from "react";
import { EditorTab, useEditorTabsStore } from "@/store/useEditorTabsStore";
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
  ref?: Ref<TPlateEditor>;
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
  const [autoSave, autoSaveTimeout] = useEditorTabsStore((store) => [
    store.autoSave,
    store.autoSaveTimeout,
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const { run: saveFile } = useDebounceFn(
    async ({ editor }: { editor: TPlateEditor }) => {
      if (fileItem && autoSave) {
        const text = editor.getApi(MarkdownPlugin).markdown.serialize();
        try {
          await writeTextFile(fileItem.path, text);
        } catch (error) {
          message.error(t`保存文件失败 ${error}`);
        }
      }
    },
    {
      wait: autoSaveTimeout,
    },
  );

  const editor = usePlateEditor({
    plugins: EditorKit,
  });

  useImperativeHandle(props.ref, () => editor, [editor]);

  useAsyncEffect(async () => {
    if (fileItem) {
      setIsLoading(true);
      try {
        const res = await readTextFile(fileItem.path);
        editor.tf.setValue(
          editor.getApi(MarkdownPlugin).markdown.deserialize(res),
        );
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
          <PlateEditor editor={editor} onValueChange={saveFile} />
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <p
        className="text-[16px] cursor-pointer text-primary-active hover:text-primary-hover"
        onClick={() => {
          onChange?.(data);
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
    </div>
  );
};
