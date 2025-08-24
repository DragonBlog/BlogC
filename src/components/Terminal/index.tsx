import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { type ITerminalInitOnlyOptions, Terminal } from "@xterm/xterm";
import { theme } from "antd";
import {
  type ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type TerminalRef = {
  write: (data: string | Uint8Array) => void;
  clear: () => void;
};

const TerminalComponent = forwardRef(
  (props: ITerminalInitOnlyOptions, ref: ForwardedRef<TerminalRef>) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null); // 保存 terminal 实例
    const fitAddonRef = useRef<FitAddon | null>(null);
    const { token } = theme.useToken();
    useEffect(() => {
      if (!terminalRef.current) return;

      const terminal = new Terminal({
        convertEol: true,
        cursorBlink: false,
        disableStdin: true,
        rows: 15,
        cols: 30,
        ...props,
        fontSize: 13,
        theme: {
          background: token.colorBgContainer,
          cursor: token.colorPrimary,
          foreground: token.colorText,
          selectionBackground: token.colorPrimaryBg,
          selectionForeground: token.colorText,
        },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(new WebLinksAddon());
      terminal.loadAddon(fitAddon);
      terminal.open(terminalRef.current);
      xtermRef.current = terminal; // 保存 terminal 实例
      fitAddonRef.current = fitAddon;
      fitAddon.fit();

      return () => {
        terminal.dispose();
      };
    }, [token, props]);

    useEffect(() => {
      const handleResize = () => {
        fitAddonRef.current?.fit();
      };

      window.addEventListener("resize", handleResize);

      // 清理事件监听器
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        write: (data: string | Uint8Array) => {
          if (xtermRef.current) {
            xtermRef.current.write(data);
          }
        },
        clear: () => {
          if (xtermRef.current) {
            xtermRef.current.clear();
          }
        },
      }),
      [],
    );

    return (
      <div
        style={{
          borderRadius: token.borderRadiusLG,
          background: token.colorBgContainer,
          padding: token.paddingXS,
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <div ref={terminalRef}></div>
      </div>
    );
  },
);

export default TerminalComponent;
