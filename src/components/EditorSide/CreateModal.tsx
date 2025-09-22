import { useLingui } from "@lingui/react/macro";
import { create, exists, mkdir } from "@tauri-apps/plugin-fs";
import { App, Form, Input, Modal, Radio } from "antd";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { match } from "ts-pattern";
import type { ExistFileProcess } from "@/command/fileManager";
import { copyFileOrFolder, moveFileOrFolder } from "@/command/fileManager";
import { useAppStore } from "@/store/useAppStore";
import { FolderSelector } from "../FolderSelector";

type Options =
  | { type: "createFile"; name?: string; folderPath: string }
  | { type: "createFolder"; name?: string; folderPath: string }
  | { type: "move"; name: string; path: string; folderPath: string }
  | {
      type: "copy";
      name: string;
      path: string;
      folderPath: string;
      originName?: string;
    };

export type CreateModalRef = {
  open: (options: Options) => void;
};

type CreateModalProps = {
  onRefresh?: (parentPath: string) => void;
};

export const CreateModal = forwardRef<CreateModalRef, CreateModalProps>(
  ({ onRefresh }, ref) => {
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);
    const { message } = App.useApp();
    const { t } = useLingui();
    const [projectDir] = useAppStore((store) => [store.projectDir]);
    const [options, setOptions] = useState<Options>();

    const folderPath = Form.useWatch("folderPath", form);

    useEffect(() => {
      if (folderPath) {
        form.validateFields(["name"]);
      }
    }, [folderPath]);

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
        width={380}
        onOk={async () => {
          const { folderPath, name } = await form.validateFields();

          try {
            await match(options)
              .with({ type: "createFolder" }, async () => {
                await mkdir(`${folderPath}/${name}`);
                onRefresh?.(folderPath);
                message.success(t`创建成功`);
              })
              .with({ type: "createFile" }, async () => {
                const file = await create(`${folderPath}/${name}`);
                await file.close();
                onRefresh?.(folderPath);
                message.success(t`创建成功`);
              })
              .with({ type: "move" }, async (opts) => {
                const to = `${folderPath}/${name}`;
                if (opts.path === to) {
                  message.info(t`未更改位置`);
                  return;
                }
                await moveFileOrFolder(opts.path, folderPath, name);
                onRefresh?.(opts.folderPath);
                onRefresh?.(folderPath);
                message.success(t`移动成功`);
              })

              .with({ type: "copy" }, async (opts) => {
                const conflictStrategy =
                  (form.getFieldValue(
                    "conflictStrategy",
                  ) as ExistFileProcess) || "skip";
                try {
                  await copyFileOrFolder(
                    opts.path,
                    folderPath,
                    name,
                    conflictStrategy,
                  );
                  onRefresh?.(opts.folderPath);
                  onRefresh?.(folderPath);
                  message.success(t`复制成功`);
                } catch (err) {
                  console.error("复制失败:", err);
                  message.error(t`复制失败`);
                }
              })
              .otherwise(async () => {});
            setOpen(false);
            form.resetFields();
          } catch (error) {
            console.log("创建失败", error);
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
          {options?.type === "copy" && (
            <Form.Item
              name="conflictStrategy"
              label={t`冲突处理`}
              initialValue="skip"
            >
              <Radio.Group>
                <Radio value="skip">{t`跳过`}</Radio>
                <Radio value="overwrite">{t`覆盖`}</Radio>
              </Radio.Group>
            </Form.Item>
          )}
        </Form>
      </Modal>
    );
  },
);
