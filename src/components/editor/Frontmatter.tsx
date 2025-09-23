import { Button, Collapse, Input } from "antd";
import { PlateElementProps } from "platejs/react";
import { useState } from "react";
import { parseMetadata } from "../../command/blogManager";
import { IconFont } from "../../components/IconFont";
import { FrontmatterElement } from "./plate-types";

const { Panel } = Collapse;

const Frontmatter = (props: PlateElementProps<FrontmatterElement>) => {
  const { attributes, element } = props;
  const [metadata, setMetadata] = useState(parseMetadata(element.value));
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const handleEdit = (key: string) => {
    setEditingKey(key);
  };

  const handleSave = (key: string, value: string) => {
    setMetadata((prevMetadata) => ({
      ...prevMetadata,
      [key]: value,
    }));
    setEditingKey(null);
  };

  const handleAddProperty = () => {
    setMetadata((prevMetadata) => ({
      ...prevMetadata,
      ["newProperty"]: "",
    }));
    setEditingKey("newProperty");
  };

  return (
    <div {...attributes} className="w-1/4">
      <Collapse>
        <Panel header="笔记属性" key="1">
          <div className="  p-3 text-sm  w-full">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="flex items-center py-1 mb-2">
                {editingKey === key ? (
                  <>
                    <Input
                      defaultValue={key}
                      onBlur={(e) => handleSave(e.target.value, value)}
                      onPressEnter={(e) =>
                        handleSave((e.target as HTMLInputElement).value, value)
                      }
                      className="mr-4 w-1/4"
                    />
                    <Input
                      defaultValue={value}
                      onBlur={(e) => handleSave(key, e.target.value)}
                      onPressEnter={(e) =>
                        handleSave(key, (e.target as HTMLInputElement).value)
                      }
                      className="w-3/4"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center mr-4">
                      <span className="text-gray-600">{key}</span>
                    </div>
                    <span className="text-gray-900 font-medium truncate">
                      {value || <span className="text-gray-400">没有值</span>}
                    </span>
                  </>
                )}
                <Button
                  type="link"
                  onClick={() => handleEdit(key)}
                  style={{ marginLeft: "8px" }}
                >
                  编辑
                </Button>
              </div>
            ))}
            <Button type="dashed" onClick={handleAddProperty} block>
              + 添加笔记属性
            </Button>
          </div>
        </Panel>
      </Collapse>
    </div>
  );
};

export default Frontmatter;
