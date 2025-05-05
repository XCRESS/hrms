import Sidebar from "./sidebar";
import { Outlet } from "react-router-dom";
import { Navigate, useLocation } from "react-router-dom";

export default function Layout() {
  const token = sessionStorage.getItem("authToken");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-6">
        <Outlet /> {/* This is where nested routes render */}
      </div>
    </div>
  );
}
