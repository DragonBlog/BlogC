import { useLingui } from "@lingui/react/macro";
import { create, exists, mkdir } from "@tauri-apps/plugin-fs";
import { App, Form, Input, Modal } from "antd";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { match } from "ts-pattern";
import { useAppStore } from "@/store/useAppStore";
import { FolderSelector } from "../FolderSelector";

type Options =
  | { type: "createFile"; name?: string; folderPath: string }
  | { type: "createFolder"; name?: string; folderPath: string }
  | { type: "move"; name: string; path: string; folderPath: string }
  | { type: "copy"; name: string; path: string; folderPath: string };

export type CreateModalRef = {
  open: (options: Options) => void;
};

type CreateModalProps = {
  onSuccess?: (parentPath: string) => void;
};

//  业务组件，完成创建、移动功能，复制有点复杂，先不做
// toolbar中的创建，和移动的folderPath是根据当前选中的节点来的，如果是文件就选它父级，如果是目录就选那个目录
// selectedItem可以从useEditorTabsStore里拿到 可以参考toolbar中的重命名文件
//  移动功能后端使用 moveFileOrFolder
export const CreateModal = forwardRef<CreateModalRef, CreateModalProps>(
  ({ onSuccess }, ref) => {
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);
    const { message } = App.useApp();
    const { t } = useLingui();
    const [projectDir] =
      useAppStore((store) => [store.projectDir]) || "E:/test/22222";
    const [options, setOptions] = useState<Options>();

    const title = useMemo(() => {
      return match(options)
        .with({ type: "createFile" }, () => t`新建文件`)
        .with({ type: "createFolder" }, () => t`新建文件夹`)
        .with({ type: "move" }, () => t`移动`)
        .with({ type: "copy" }, () => t`复制`)
        .otherwise(() => "");
    }, [t, options]);

    useImperativeHandle(ref, () => ({
      open: (opts: Options) => {
        setOptions(opts);
        form.setFieldsValue({
          name: opts.name,
          folderPath: opts.folderPath,
        });
        setOpen(true);
      },
    }));

    return (
      <Modal
        open={open}
        title={title}
        onOk={async () => {
          const { folderPath, name } = form.getFieldsValue();

          try {
            if (options?.type === "createFolder") {
              await mkdir(`${folderPath}/${name}`);
              onSuccess?.(folderPath);
              message.success(t`创建成功`);
            }
            if (options?.type === "createFile") {
              const file = await create(`${folderPath}/${name}`);
              await file.close();
              onSuccess?.(folderPath);
              message.success(t`创建成功`);
            }
            setOpen(false);
            form.resetFields();
          } catch (error) {
            message.error("创建失败");
          }
        }}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t`名称`}
            rules={[
              { required: true, message: t`请输入名称` },
              {
                validator: async (rule, value) => {
                  if (!value || !options?.folderPath) return Promise.resolve();
                  const targetPath = `${options.folderPath}/${value}`;
                  const isExists = await exists(targetPath);
                  if (isExists) {
                    return Promise.reject(new Error(t`${value} 已存在`));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            validateTrigger="onBlur"
          >
            <Input />
          </Form.Item>
          <Form.Item name="folderPath" label={t`文件夹路径`}>
            <FolderSelector
              rootPath={projectDir}
              virtual
              className="max-h-60 border"
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  },
);
