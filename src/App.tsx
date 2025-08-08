import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getStore } from "@tauri-apps/plugin-store";
import { start } from "./command";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [, setName] = useState("");
  useEffect(() => {
    Promise.resolve().then(async () => {
      const store = await getStore("access_token");
      const token = await store?.get<string>("access_token");
      setGreetMsg(token ?? "No token found.");
    });
  }, []);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    // setGreetMsg(await invoke("greet", { name }));
    await start((url) => {
      console.log("Opening URL:", url);
      openUrl(url);
    });
    const store = await getStore("access_token");
    const token = await store?.get<string>("access_token");
    getCurrentWindow().setFocus();
    setGreetMsg(token ?? "No token found.");
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
      <p>{greetMsg}</p>
    </main>
  );
}

export default App;
