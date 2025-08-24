import type { Child } from "@tauri-apps/plugin-shell";
import {
  Button,
  Card,
  Flex,
  Form,
  Progress,
  Steps,
  Typography,
  theme,
} from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { match } from "ts-pattern";
import { checkDir, initBlog } from "../../command";
import { FilePathSelector } from "../../components/FilePathSelector";
import TerminalComponent, { type TerminalRef } from "../../components/Terminal";
import { useAppStore } from "../../store/useAppStore";
import { formatBytes, installDependencies } from "../../utils";

export const Init = () => {
  const [projectDir, setProjectDir] = useAppStore((store) => [
    store.projectDir,
    store.setProjectDir,
  ]);
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [percent, setPercent] = useState(0);
  const [bytes, setBytes] = useState(0);
  const terminalRef = useRef<TerminalRef>(null);
  const navigate = useNavigate();
  const [child, setChild] = useState<Child>();

  // todo: 组件卸载时杀掉子进程
  useEffect(() => {
    return () => {
      child?.kill();
    };
  }, [child]);

  const { token } = theme.useToken();

  const steps = [
    {
      title: "设置目录",
      content: (
        <Form
          form={form}
          className="w-full flex justify-center"
          layout="vertical"
        >
          <Form.Item
            label="项目目录"
            name="projectDir"
            className="w-100"
            rules={[
              {
                required: true,
                validator: async (_, value) => {
                  const res = await checkDir(value ?? "");

                  if (!res.exists) {
                    return Promise.reject(
                      new Error("目录不存在，请选择一个有效目录"),
                    );
                  }
                  if (!res.isEmpty) {
                    return Promise.reject(
                      new Error("目录不为空，请选择一个空目录"),
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <FilePathSelector placeholder="请选择或输入项目目录" />
          </Form.Item>
        </Form>
      ),

      onNext: async () => {
        try {
          const values = await form.validateFields();
          setProjectDir(values.projectDir);
          setStep(1);
          setBytes(0);
          setPercent(0);

          await initBlog(values.projectDir, (progress) => {
            match(progress)
              .with(
                {
                  type: "receiving",
                },
                ({ data }) => {
                  setPercent(Math.floor(data[0]));
                  setBytes(data[1]);
                },
              )
              .with({ type: "processing" }, ({ data }) => {
                setPercent(data);
              })
              .with({ type: "finished" }, () => {
                setPercent(100);
              })
              .exhaustive();
          });
        } catch (_error) {}
      },
    },
    {
      title: "初始化项目",
      content: (
        <div className="w-100 mx-auto">
          <Typography.Text>下载模版中</Typography.Text>
          <Progress percent={percent} type="line" />
          <Typography.Text type="secondary">
            {formatBytes(bytes)} 已接收
          </Typography.Text>
        </div>
      ),
      onNext: async () => {
        setStep(2);
        await installDependencies({
          cwd: `${projectDir}/template`,
          onStart: (child) => {
            setChild(child);
          },
          onOutput: (output) => {
            terminalRef.current?.write(output.log);
          },
        });
      },
    },
    {
      title: "下载依赖",
      content: (
        <Flex className="w-full overflow-hidden" vertical gap="middle">
          依赖下载中，请耐心等待...
          <div
            className="border rounded"
            style={{
              borderColor: token.colorBorder,
            }}
          >
            <TerminalComponent cols={10} rows={12} ref={terminalRef} />
          </div>
        </Flex>
      ),
      onNext: () => {
        setStep(3);
      },
    },
    {
      title: "完成",
      content: <div>完成内容</div>,
      onPrev: () => {
        setStep(0);
      },
      onNext: async () => {
        // 完成后续操作，例如跳转到主页面
        navigate("/content-manager");
      },
    },
  ];

  return (
    <Flex className="h-full w-full" align="center" justify="center">
      <Card>
        <Flex vertical className="h-80 w-2xl" gap="middle">
          <Steps size="small" current={step} items={steps} />
          <Flex flex={1} className="w-full">
            {steps[step].content}
          </Flex>
          <Flex justify="center" gap="middle">
            {steps[step].onPrev && (
              <Button
                onClick={() => {
                  steps[step].onPrev?.();
                }}
              >
                上一步
              </Button>
            )}
            {steps[step].onNext && (
              <Button
                type="primary"
                onClick={() => {
                  steps[step].onNext?.();
                }}
              >
                {step === 3 ? "完成" : "下一步"}
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};
