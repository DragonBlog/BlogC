import React from "react";
import { Link, Outlet } from "react-router-dom";
import Nav from "../components/Nav";

const Archives = () => {
  return (
    <div>
      <Nav showArchives={false} />
      <h1>文章</h1>

      <ul
        style={{ listStyle: "none", padding: 0, display: "flex", gap: "10px" }}
      >
        <li>
          <Link
            to="/archives/categories"
            style={{
              padding: "5px 10px",
              textDecoration: "none",
              border: "1px solid #ccc",
            }}
          >
            分类
          </Link>
        </li>
        <li>
          <Link
            to="/archives/tags"
            style={{
              padding: "5px 10px",
              textDecoration: "none",
              border: "1px solid #ccc",
            }}
          >
            标签
          </Link>
        </li>
      </ul>

      <Outlet />
    </div>
  );
};

export default Archives;
