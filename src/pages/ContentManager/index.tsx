import { Flex } from "antd";
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
      <div className="w-64 border rounded border-border h-full overflow-hidden flex">
        <FileTree
          onClick={(item) => {
            console.log(item);
          }}
        />
      </div>
      ContentManager
    </Flex>
  );
};
