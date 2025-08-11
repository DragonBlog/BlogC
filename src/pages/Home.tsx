import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import reactLogo from "../assets/react.svg";
import "../App.css";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { start } from "../command";
import Nav from "../components/Nav";
import { useAppStore } from "../store/useAppStore";

function Home() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [accessToken, setAccessToken] = useAppStore((store) => [
    store.accessToken,
    store.setAccessToken,
  ]);

  useEffect(() => {
    setGreetMsg(accessToken ?? "No token found.");
  }, [accessToken]);

  async function greet() {
    const token = await start((url) => {
      console.log("Opening URL:", url);
      openUrl(url);
    });
    setAccessToken(token);
    getCurrentWindow().setFocus();
  }

  return (
    <main className="container">
      <Nav />

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

export default Home;
