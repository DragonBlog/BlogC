import { Outlet } from "react-router-dom";
import { MenuSide } from "./MenuSide";

export const Config = () => {
  return (
    <div className="flex-1 flex overflow-hidden">
      <MenuSide />
      <div className="flex-1 p-4">
        <Outlet />
      </div>
    </div>
  );
};
