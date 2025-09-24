import {
  EditOutlined,
  FieldTimeOutlined,
  TagsOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Collapse, Input, InputRef } from "antd";
import { PlateElementProps } from "platejs/react";
import { useCallback, useRef, useState } from "react";
import { parseMetadata } from "../../command/blogManager";
import { IconFont } from "../../components/IconFont";
import { FrontmatterElement } from "./plate-types";

const { Panel } = Collapse;

const getIconByKey = (key: string) => {
  if (/time|date/i.test(key)) return <IconFont name="icon-time" />;
  if (/tag/i.test(key)) return <TagsOutlined />;
  if (/alias/i.test(key)) return <UserOutlined />;
  return <EditOutlined />;
};

type EditState = { type: "key" | "value"; field: string } | null;

const Frontmatter = (props: PlateElementProps<FrontmatterElement>) => {
  const { attributes, element } = props;
  const [metadata, setMetadata] = useState(() => parseMetadata(element.value));
  const [editState, setEditState] = useState<EditState>(null); // 当前正在编辑的字段和类型

  const keyInputRefs = useRef<Record<string, InputRef | null>>({});
  const valueInputRefs = useRef<Record<string, InputRef | null>>({});

  const handleSaveKey = useCallback((oldKey: string, newKey: string) => {
    if (oldKey === newKey || !newKey.trim()) {
      setMetadata((prev) => {
        const value = prev[oldKey];
        const updated = { ...prev };
        delete updated[oldKey];
        if (newKey.trim()) {
          updated[newKey] = value;
        } else {
        }
        return updated;
      });
      return;
    }

    setMetadata((prev) => {
      const { [oldKey]: value, ...rest } = prev;
      return { ...rest, [newKey]: value };
    });
  }, []);

  const handleSaveValue = useCallback((key: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFocusKey = (key: string) => {
    setEditState({ type: "key", field: key });
  };

  const handleFocusValue = (key: string) => {
    setEditState({ type: "value", field: key });
  };

  const handleBlurKey = (oldKey: string, newKey: string) => {
    setEditState(null);
    handleSaveKey(oldKey, newKey);
  };

  const handleBlurValue = (key: string, value: string) => {
    setEditState(null);
    handleSaveValue(key, value);
  };

  const handleAddProperty = () => {
    const newKey = `property_${Date.now()}`;
    setMetadata((prev) => ({ ...prev, [newKey]: "" }));
    setTimeout(() => {
      keyInputRefs.current[newKey]?.focus();
    }, 0);
  };

  return (
    <div {...attributes} className="w-full max-w-md my-4">
      <Collapse ghost className="w-full">
        <Panel
          key="1"
          showArrow={false}
          header={<span className="text-gray-800 font-medium">笔记属性</span>}
        >
          <div className="text-sm w-5/6 space-y-2">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <Input
                  prefix={getIconByKey(key)}
                  ref={(ref) => {
                    keyInputRefs.current[key] = ref;
                  }}
                  defaultValue={key}
                  variant={
                    editState?.type === "key" && editState.field === key
                      ? undefined
                      : "borderless"
                  }
                  onFocus={() => handleFocusKey(key)}
                  onBlur={(e) => handleBlurKey(key, e.target.value)}
                  onPressEnter={(e) =>
                    handleBlurKey(key, (e.target as HTMLInputElement).value)
                  }
                  className="flex-1 min-w-0 text-gray-600 font-medium"
                  size="small"
                />

                <Input
                  ref={(ref) => {
                    valueInputRefs.current[key] = ref;
                  }}
                  defaultValue={value}
                  variant={
                    editState?.type === "value" && editState.field === key
                      ? undefined
                      : "borderless"
                  }
                  onFocus={() => handleFocusValue(key)}
                  onBlur={(e) => handleBlurValue(key, e.target.value)}
                  onPressEnter={(e) =>
                    handleBlurValue(key, (e.target as HTMLInputElement).value)
                  }
                  className="flex-1 min-w-0"
                  size="small"
                />
              </div>
            ))}

            <div className="flex items-center gap-2 text-gray-500">
              <IconFont name="icon-time" />
              <Button
                type="text"
                onClick={handleAddProperty}
                className="!pl-0 text-gray-600 hover:text-gray-900"
              >
                添加笔记属性
              </Button>
            </div>
          </div>
        </Panel>
      </Collapse>
    </div>
  );
};

export default Frontmatter;
