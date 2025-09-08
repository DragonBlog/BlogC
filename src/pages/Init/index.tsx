import { Trans } from "@lingui/react/macro";
import {
  App,
  Button,
  Card,
  Flex,
  Form,
  Progress,
  Result,
  Steps,
  Typography,
  theme,
} from "antd";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { match } from "ts-pattern";
import { initOrOpenBlog, installTemplate } from "@/command/blogManager";
import { checkDir } from "../../command";
import { FilePathSelector } from "../../components/FilePathSelector";
import TerminalComponent, { type TerminalRef } from "../../components/Terminal";
import { useAppStore } from "../../store/useAppStore";
import {
  formatBytes,
  type InstallStatus,
  installDependencies,
} from "../../utils";

export const Init = () => {
  const [projectDir, setProjectDir] = useAppStore((store) => [
    store.projectDir,
    store.setProjectDir,
  ]);
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [percent, setPercent] = useState(0);
  const [bytes, setBytes] = useState(0);
  const terminalRef = useRef<TerminalRef>(null);
  const navigate = useNavigate();
  const [installStatus, setInstallStatus] = useState<InstallStatus>();
  const [isNextDisabled, setIsNextDisabled] = useState(false);

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

          const shouldInstallTemplate = await initOrOpenBlog(values.projectDir);
          if (shouldInstallTemplate) {
            setStep(1);
            setBytes(0);
            setPercent(0);
            setIsNextDisabled(true);
            await installTemplate(values.projectDir, (progress) => {
              match(progress)
                .with({ type: "receiving" }, ({ data }) => {
                  setPercent(Math.floor(data[0]));
                  setBytes(data[1]);
                })
                .with({ type: "processing" }, ({ data }) => {
                  setPercent(data);
                })
                .with({ type: "finished" }, () => {
                  setPercent(100);
                  setIsNextDisabled(false);
                })
                .exhaustive();
            });
          } else {
            setStep(2);
            setIsNextDisabled(true);

            await installDependencies({
              cwd: `${projectDir}/template`,
              onOutput: (output) => {
                terminalRef.current?.write(output.log);
              },
              onStatus: (installStatus) => {
                setInstallStatus(installStatus);
                if (installStatus === "completed") {
                  setIsNextDisabled(false);
                }
              },
            });
          }
        } catch (_error) {
          console.log(_error);
          message.error("初始化博客失败，请检查路径或网络连接");
        }
      },
    },
    {
      title: "下载模版",
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
        setIsNextDisabled(true);

        await installDependencies({
          cwd: `${projectDir}/template`,
          onOutput: (output) => {
            terminalRef.current?.write(output.log);
          },
          onStatus: (installStatus) => {
            setInstallStatus(installStatus);
            if (installStatus === "completed") {
              setIsNextDisabled(false);
            }
          },
        });
      },
    },
    {
      title: "下载依赖",
      content: (
        <Flex className="w-full overflow-hidden" vertical gap="middle">
          {match(installStatus)
            .with("installing_node", () => (
              <Typography.Text>正在安装 Node.js</Typography.Text>
            ))
            .with("installing_nrm", () => (
              <Typography.Text>正在安装 nrm</Typography.Text>
            ))
            .with("installing_pnpm", () => (
              <Typography.Text>正在安装 pnpm</Typography.Text>
            ))
            .with("installing_dependencies", () => (
              <Typography.Text>正在安装依赖</Typography.Text>
            ))
            .with("completed", () => (
              <Typography.Text>依赖安装完成</Typography.Text>
            ))
            .otherwise(() => (
              <Typography.Text>等待中...</Typography.Text>
            ))}
          <div
            className="border rounded"
            style={{ borderColor: token.colorBorder }}
          >
            <TerminalComponent
              key={projectDir}
              cols={10}
              rows={10}
              ref={terminalRef}
            />
          </div>
        </Flex>
      ),
      onNext: () => {
        if (installStatus !== "completed") {
          message.warning("依赖还没安装完成，请耐心等待...");
          return;
        }
        setInstallStatus(undefined);

        setStep(3);
      },
    },
    {
      title: "完成",
      content: (
        <div className="w-100 mx-auto">
          <Result
            status="success"
            title={<Trans>博客初始化完成！</Trans>}
            subTitle={
              <Trans>
                你现在可以开始使用博客管理系统了，点击完成按钮进入内容管理页面。
              </Trans>
            }
          />
        </div>
      ),
      onPrev: () => setStep(0),
      onNext: async () => {
        navigate("/content-manager");
      },
    },
  ];

  return (
    <Flex className="h-full w-full" align="center" justify="center">
      <Card>
        <Flex vertical className="h-80 w-2xl overflow-hidden" gap="middle">
          <Steps size="small" current={step} items={steps} />
          <Flex flex={1} className="w-full overflow-hidden">
            {steps[step].content}
          </Flex>
          <Flex justify="center" gap="middle">
            {steps[step].onPrev && (
              <Button onClick={() => steps[step].onPrev?.()}>上一步</Button>
            )}
            {steps[step].onNext && (
              <Button
                type="primary"
                disabled={isNextDisabled} // 🚀 核心：未完成禁止点击
                onClick={() => steps[step].onNext?.()}
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
