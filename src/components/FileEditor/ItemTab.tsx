import { Trans } from "@lingui/react/macro";
import { Typography } from "antd";
import { EditorTab } from "@/store/useEditorTabsStore";
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

  if (fileItem) {
    return <PlateEditor />;
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
