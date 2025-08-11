import type React from "react";
import { Link } from "react-router-dom";

interface NavProps {
  showHome?: boolean;
  showArchives?: boolean;
  showTimeline?: boolean;
  showAbout?: boolean;
}

const Nav: React.FC<NavProps> = ({
  showHome = true,
  showArchives = true,
  showTimeline = true,
  showAbout = true,
}) => {
  return (
    <nav style={{ marginBottom: "20px" }}>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {showHome && (
          <li>
            <Link
              to="/"
              style={{
                padding: "5px 10px",
                textDecoration: "none",
                border: "1px solid #ccc",
              }}
            >
              Home
            </Link>
          </li>
        )}
        {showArchives && (
          <li>
            <Link
              to="/archives"
              style={{
                padding: "5px 10px",
                textDecoration: "none",
                border: "1px solid #ccc",
              }}
            >
              Archives
            </Link>
          </li>
        )}
        {showTimeline && (
          <li>
            <Link
              to="/timeline"
              style={{
                padding: "5px 10px",
                textDecoration: "none",
                border: "1px solid #ccc",
              }}
            >
              Timeline
            </Link>
          </li>
        )}
        {showAbout && (
          <li>
            <Link
              to="/about"
              style={{
                padding: "5px 10px",
                textDecoration: "none",
                border: "1px solid #ccc",
              }}
            >
              About
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Nav;
