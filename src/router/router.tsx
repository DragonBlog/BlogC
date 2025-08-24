import { createBrowserRouter, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { Config } from "../pages/Config";
import { ContentManager } from "../pages/ContentManager";
import { Home } from "../pages/Home";
import { Init } from "../pages/Init";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/content-manager",
        element: <ContentManager />,
      },
      {
        path: "/config",
        element: <Config />,
      },
    ],
  },
  {
    path: "/init",
    element: <Init />,
  },
  {
    path: "*",
    element: (
      <div>
        404
        <Link to="/">返回首页</Link>
      </div>
    ),
  },
]);

export default router;
