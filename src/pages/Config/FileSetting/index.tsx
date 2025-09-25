import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Button } from "antd";
import { useEffect, useRef } from "react";

export const FileSetting = () => {
  const unListenRef = useRef<() => void>(null);

  useEffect(() => {
    return () => {
      unListenRef.current?.();
    };
  }, []);

  return (
    <div>
      FileSetting
      <Button
        onClick={async () => {
          try {
            // const window = new Window("init");
            // console.log("window", window);
            const initWindow = new WebviewWindow("init", {
              width: 800,
              height: 500,
              title: "init",
              url: "/init",
            });

            await initWindow.show();
          } catch (error) {
            console.error("Error executing command:", error);
          }
          // initWindow.show();
        }}
      >
        test
      </Button>
    </div>
  );
};
