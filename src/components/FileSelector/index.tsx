import { InboxOutlined } from "@ant-design/icons";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { App, Button, Card, Divider, Flex, List, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";

const { Text } = Typography;

interface FileItem {
  path: string;
  name: string;
}

export const FileSelector = () => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const { message, modal } = App.useApp();
  const appWindow = getCurrentWindow();

  const allowedExtensions = [
    "txt",
    "md",
    "log",
    "pdf",
    "doc",
    "docx",
    "png",
    "jpg",
    "jpeg",
    "gif",
  ];

  const addFiles = useCallback(
    (paths: string[]) => {
      const newFiles = paths
        .filter((p) => {
          const ext = (p.split(".").pop() || "").toLowerCase();
          if (!ext || !allowedExtensions.includes(ext)) {
            message.warning(`文件类型不支持: ${p}`);
            return false;
          }
          return true;
        })
        .map((path): FileItem => {
          const parts = path.split(/[/\\]/);
          const fileName = parts[parts.length - 1] || "unknown";
          return { path, name: fileName };
        });

      setFileList((prev) => {
        const existing = new Set(prev.map((f) => f.path));
        return [...prev, ...newFiles.filter((f) => !existing.has(f.path))];
      });

      if (newFiles.length > 0) {
        message.success(`已添加 ${newFiles.length} 个文件`);
      }
    },
    [message],
  );
  const handleClearAll = () => {
    if (fileList.length === 0) return;
    modal.confirm({
      title: "清空所有文件？",

      cancelText: "取消",
      okText: "确认",
      onOk() {
        setFileList([]);
      },
    });
  };
  const handleClickUpload = useCallback(() => {
    open({
      multiple: true,
      filters: [
        {
          name: "文档与图片",
          extensions: allowedExtensions,
        },
      ],
    }).then((selected) => {
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        addFiles(paths);
      }
    });
  }, [addFiles]);

  const handleRemove = (index: number) => {
    modal.confirm({
      title: "确认删除？",
      content: `是否删除文件 ${fileList[index].name}？`,
      cancelText: "取消",
      okText: "确认",
      onOk() {
        setFileList((prev) => prev.filter((_, i) => i !== index));
      },
    });
  };

  useEffect(() => {
    let removeListener: (() => void) | null = null;

    appWindow
      .onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          const paths = event.payload.paths;
          if (paths) {
            addFiles(paths);
          }
        }
      })
      .then((unlisten) => {
        removeListener = unlisten;
      })
      .catch((error) => {
        console.error("拖拽事件监听器绑定失败:", error);
      });

    return () => {
      removeListener?.();
    };
  }, [appWindow, addFiles]);
  return (
    <Card bordered={false} size="default">
      <Flex vertical gap="middle">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="primary"
            style={{ marginBottom: 10 }}
            onClick={handleClearAll}
            disabled={fileList.length === 0}
          >
            清空列表
          </Button>
        </div>

        <button
          type="button"
          onClick={handleClickUpload}
          style={{
            border: "2px dashed #fa8c16",
            padding: "40px",
            textAlign: "center",
            cursor: "pointer",
            borderRadius: "8px",
            background: "none",
            outline: "none",
            width: "100%",
            transition: "border-color 0.3s, background-color 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#fa541c";
            e.currentTarget.style.backgroundColor = "rgba(250, 140, 22, 0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#fa8c16";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <p style={{ fontSize: 28, marginBottom: 10 }}>
            <InboxOutlined style={{ color: "#fa8c16" }} />
          </p>
          <p style={{ color: "#fa8c16" }}>拖拽文件到此处，或点击上传</p>
        </button>
        <Text>已选文件 ({fileList.length})</Text>

        <Divider></Divider>
        {fileList.length === 0 ? (
          <Text type="secondary">尚未选择任何文件</Text>
        ) : (
          <List
            size="small"
            bordered
            dataSource={fileList}
            renderItem={(item, index) => (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    size="small"
                    key={item.path}
                    danger
                    onClick={() => handleRemove(index)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Text code copyable title={item.path}>
                      {item.name}
                    </Text>
                  }
                  description={
                    <Text type="secondary" ellipsis={{ tooltip: item.path }}>
                      {item.path}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Flex>
    </Card>
  );
};
