import { FileOutlined } from "@ant-design/icons";
import { homeDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { useControllableValue } from "ahooks";
import { App, Button, Input, type InputProps, Space } from "antd";
import { checkDir } from "../../command";

type FileSelectorProps = InputProps & {
  value?: string;
  onChange?: (value: string) => void;
};

export const FileSelector = (props: FileSelectorProps) => {
  const [value, setValue] = useControllableValue<string>(props);
  const { message } = App.useApp();
  return (
    <Space.Compact style={{ width: "100%" }}>
      <Input
        {...props}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
      />
      <Button
        type="primary"
        icon={<FileOutlined />}
        onClick={async () => {
          try {
            const selected = await open({
              directory: true,
              defaultPath: await homeDir(),
            });
            const check = await checkDir(selected as string);
            console.log("Directory check result:", check);
            if (selected) {
              setValue(selected as string);
            }
          } catch (error) {
            message.error(`Failed to open directory: ${error}`);
          }
        }}
      />
    </Space.Compact>
  );
};
