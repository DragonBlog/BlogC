import { Trans, useLingui } from "@lingui/react/macro";
import { App, Button, Progress, Typography } from "antd";
import { useRef, useState } from "react";
import { match } from "ts-pattern";
import { cancelDownloadModel, downloadModel } from "@/command/llm";
import { formatBytes } from "@/utils";

export const Config = () => {
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [filename, setFilename] = useState("");
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState(0);
  const { message } = App.useApp();
  const timeRef = useRef(Date.now());
  const chunkRef = useRef(0);
  const { t } = useLingui();

  return (
    <div>
      <div>
        Config
        <Button
          onClick={() => {
            try {
              downloadModel("Qwen/Qwen3-4B", (e) => {
                match(e)
                  .with({ status: "init" }, (e) => {
                    setFilename(e.filename);
                    setTotal(e.total);
                    setCurrent(0);
                    setProgress(0);
                    timeRef.current = Date.now();
                  })
                  .with({ status: "update" }, (e) => {
                    setCurrent(e.downloaded);
                    setProgress(Math.floor((e.downloaded / e.total) * 100));
                    const now = Date.now();
                    if (now - timeRef.current > 1000) {
                      const chunk = e.downloaded - chunkRef.current;

                      setSpeed((chunk / (now - timeRef.current)) * 1000);
                      console.log(
                        "speed",
                        now - timeRef.current,
                        formatBytes(chunk),
                      );
                      chunkRef.current = e.downloaded;
                      timeRef.current = now;
                    }
                  })
                  .with({ status: "finish" }, (e) => {
                    setProgress(100);
                  })
                  .exhaustive();
              });
            } catch (error) {
              message.error(t`下载模型失败:${(error as Error).message}`);
            }
          }}
        >
          download qwen/qwen3-4b
        </Button>
        <Button onClick={() => cancelDownloadModel("Qwen/Qwen3-4B")}>
          cancel
        </Button>
      </div>
      <div className="w-64 p-4 m-auto border rounded mt-4">
        <p>
          <Trans>文件名：</Trans>
          {filename}
        </p>

        <Typography.Text type="secondary">
          {formatBytes(current)}/{formatBytes(total)} {progress}%{" "}
          {speed > 0 ? ` - ${formatBytes(speed)}/s` : "~/s"}
        </Typography.Text>
        <Progress percent={progress} />
      </div>
    </div>
  );
};
