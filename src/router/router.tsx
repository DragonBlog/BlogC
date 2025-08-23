import { createBrowserRouter } from "react-router-dom";
import Init from "../components/Init";
import Layout from "../components/Layout";
import Terminal from "../components/Terminal";
import Home from "../pages/Home";

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
        path: "/init",
        element: <Init />,
      },
      {
        path: "/terminal",
        element: <Terminal />,
      },
    ],
  },
]);

export default router;
