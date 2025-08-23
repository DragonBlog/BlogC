import { useEffect, useRef, useState } from "react";
import "../App.css";
import reactLogo from "../assets/react.svg";
import TerminalComponent, { type TerminalRef } from "../components/Terminal";
import { useAppStore } from "../store/useAppStore";
import { exec } from "../utils";

// import { checkAndInstallDependencies } from "../utils";

function Home() {
  const [greetMsg, setGreetMsg] = useState("");
  const [, setName] = useState("");
  const [accessToken] = useAppStore((store) => [
    store.accessToken,
    store.setAccessToken,
  ]);
  const [pid, setPid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const termRef = useRef<TerminalRef>(null);
  const [version, setVersion] = useState("");
  useEffect(() => {
    setGreetMsg(accessToken ?? "No token found.");
  }, [accessToken]);

  async function greet() {
    // oauth 流程
    // const token = await start((url) => {
    //   console.log("Opening URL:", url);
    //   openUrl(url);
    // });
    // setAccessToken(token);
    // getCurrentWindow().setFocus();

    try {
      // 检查并安装依赖流程
      // await checkAndInstallDependencies(
      //   (output) => {
      //     termRef.current?.writeln(output.log);
      //     console.log(output.log);
      //   },
      //   (pid) => {
      //     setPid(pid);
      //   }
      // );
      exec("pnpm", ["dev"], false, {
        // encoding: "raw",
        cwd: "/Users/yexiyue/test2/template",
        onOutput: (output) => {
          console.log(output.log);
          termRef.current?.write(output.log);
        },
        onStart: (child) => {
          console.log("start", child);
        },
        env: {
          FORCE_COLOR: "1",
        },
      });
    } catch (error) {
    } finally {
      setPid(null);
    }
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vitejs.dev" target="_blank" rel="noopener">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank" rel="noopener">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank" rel="noopener">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <p
        style={{
          color: "red",
        }}
      >
        {error}
      </p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <button
        type="button"
        onClick={async () => {
          try {
            if (pid) {
              // await kill(pid);
            }
          } catch (error) {
            console.error("Failed to kill process:", error);
          }
        }}
      >
        kill {pid}
      </button>
      <p>{greetMsg}</p>
      <div
        style={{
          width: "100%",
          height: "100px",
        }}
      >
        <TerminalComponent ref={termRef} />
      </div>
    </main>
  );
}

export default Home;
