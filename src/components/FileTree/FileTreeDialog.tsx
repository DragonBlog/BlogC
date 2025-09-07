import { Form, Input, Modal } from "antd";
import { useEffect } from "react";

type FileTreeDialogProps = {
  open: boolean;
  title: string;
  defaultValue?: string;
  mode?: "rename" | "createFile" | "createFolder" | "delete";
  onOk: (value: string) => void;
  onCancel: () => void;
};

export const FileTreeDialog = ({
  open,
  title,
  defaultValue,
  mode,
  onOk,
  onCancel,
}: FileTreeDialogProps) => {
  const [form] = Form.useForm();
  useEffect(() => {
    console.log("🚀 FileTreeDialog mode:", mode, "typeof:", typeof mode);
  }, [mode]);
  useEffect(() => {
    if (open && mode === "rename") {
      form.setFieldsValue({ name: defaultValue });
    } else {
      form.resetFields();
    }
  }, [open, defaultValue, form, mode]);

  return (
    <Modal
      open={open}
      title={title}
      onOk={() => {
        if (mode === "delete") {
          onOk("");
          return;
        }
        form.validateFields().then((values) => {
          onOk(values.name);
        });
      }}
      onCancel={onCancel}
    >
      {mode === "delete" ? (
        <div>
          确认删除 <strong>{defaultValue}</strong> 吗？
        </div>
      ) : (
        <Form form={form} layout="vertical">
          {mode === "rename" && (
            <div style={{ marginBottom: 8, color: "#888" }}>
              旧名称：{defaultValue}
            </div>
          )}
          {mode !== "rename" && (
            <div style={{ marginBottom: 8, color: "#888" }}>
              父目录：{defaultValue}
            </div>
          )}

          <Form.Item
            name="name"
            label={mode === "rename" ? "新名称" : "名称"}
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};
