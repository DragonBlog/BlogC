import { createBrowserRouter } from "react-router-dom";
import About from "../pages/About";
import Archives from "../pages/Archives";
import Categories from "../pages/Categories";
import Home from "../pages/Home";
import Tags from "../pages/Tags";
import Timeline from "../pages/Timeline";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/archives",
    element: <Archives />,
    children: [
      {
        path: "categories", // 修复子路由路径
        element: <Categories />,
      },
      {
        path: "tags", // 修复子路由路径
        element: <Tags />,
      },
    ],
  },
  {
    path: "/timeline",
    element: <Timeline />,
  },
  {
    path: "/about",
    element: <About />,
  },
  {
    path: "*", // 添加404页面处理
    element: (
      <div style={{ padding: "20px" }}>
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <a href="/">Go back to Home</a>
      </div>
    ),
  },
]);

export default router;
