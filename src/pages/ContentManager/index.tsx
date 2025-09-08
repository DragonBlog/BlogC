import { Flex } from "antd";
import { PlateEditor } from "@/components/editor/plate-editor";
import { FileTree } from "../../components/FileTree";

export const ContentManager = () => {
  return (
    <Flex
      flex={1}
      style={{
        overflow: "hidden",
      }}
      className=" font-family"
    >
      <div className="w-64 border-r h-full border-border overflow-hidden flex shrink-0">
        <FileTree />
      </div>
      <div className="flex-1 h-full w-full overflow-hidden">
        <PlateEditor />
      </div>
    </Flex>
  );
};
