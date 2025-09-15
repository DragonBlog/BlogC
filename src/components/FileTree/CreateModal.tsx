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

export const CreateModal = forwardRef<CreateModalRef, CreateModalProps>(
  ({ onSuccess }, ref) => {
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);
    const { message } = App.useApp();
    const { t } = useLingui();
    const [projectDir] = useAppStore((store) => [store.projectDir]);
    const [options, setOptions] = useState<Options>();

    const folderPath = Form.useWatch("folderPath", form);

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
        centered
        width={328}
        onOk={async () => {
          const { folderPath, name } = await form.validateFields();

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
                validator: async (_rule, value) => {
                  if (value) {
                    const targetPath = `${folderPath}/${value}`;
                    const isExists = await exists(targetPath).catch(() => {
                      throw new Error(t`请输入正确的名称`);
                    });

                    if (isExists) {
                      return Promise.reject(new Error(t`${value} 已存在`));
                    }
                  }

                  return Promise.resolve();
                },
              },
            ]}
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
