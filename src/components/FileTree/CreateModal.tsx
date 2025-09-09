import { useLingui } from "@lingui/react/macro";
import { Form, Input, Modal } from "antd";
import {
  ForwardedRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { match } from "ts-pattern";
import { useAppStore } from "@/store/useAppStore";
import { FolderSelector } from "../FolderSelector";

type Options =
  | {
      type: "createFile";
      name?: string;
      folderPath: string;
    }
  | {
      type: "createFolder";
      name?: string;
      folderPath: string;
    }
  | {
      type: "move";
      name: string;
      folderPath: string;
    }
  | {
      type: "copy";
      name: string;
      folderPath: string;
    };

export type CreateModalRef = {
  open: (options: Options) => void;
  onCreateFile?: (name: string, folderPath: string) => void;
  onCreateFolder?: (name: string, folderPath: string) => void;
  onMove?: (name: string, folderPath: string) => void;
  onCopy?: (name: string, folderPath: string) => void;
};

export const CreateModal = forwardRef(
  (props, ref: ForwardedRef<CreateModalRef>) => {
    const [form] = Form.useForm();
    const [open, setOpen] = useState(false);
    const { t } = useLingui();
    const [projectDir] = useAppStore((store) => [store.projectDir]);
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
        onOk={() => {}}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t`名称`}
            rules={[{ required: true, message: t`请输入名称` }]}
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
