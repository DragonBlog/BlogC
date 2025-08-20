import { useEffect, useState } from "react";
import "../App.css";
import reactLogo from "../assets/react.svg";
import { kill } from "../command";
import { useAppStore } from "../store/useAppStore";
import { checkAndInstallDependencies } from "../utils";

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
      await checkAndInstallDependencies(
        (output) => {
          console.log(output);
          if (output.log.includes("v")) {
            setVersion((prev) => `${prev} ${output.log}`);
          }
        },
        (pid) => {
          setPid(pid);
        },
      );
    } catch (error) {
      console.error(error);
      setError(JSON.stringify(error));
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
      <p>{version}</p>
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
              await kill(pid);
            }
          } catch (error) {
            console.error("Failed to kill process:", error);
          }
        }}
      >
        kill {pid}
      </button>
      <p>{greetMsg}</p>
    </main>
  );
}

export default Home;
