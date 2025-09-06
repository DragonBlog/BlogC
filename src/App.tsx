import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import "./App.css";
import "antd/dist/reset.css";
import "@xterm/xterm/css/xterm.css";
import { I18nProvider } from "./components/I18nProvider";

function App() {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

export default App;
