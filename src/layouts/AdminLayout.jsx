// src/layouts/AdminLayout.jsx
import React from "react";
import AdminSidebar from "../components/AdminSidebar";
import AdminTopNavBar from "../components/AdminTopNavBar";

const AdminLayout = ({
  sidebarMinimized,
  setSidebarMinimized,
  onProfileClick,
  onLogoutClick,
  children,
}) => (
  <div className="flex h-screen bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
    {/* ───────── Sidebar ───────── */}
    <AdminSidebar
      minimized={sidebarMinimized}
      setSidebarMinimized={(val) => {
        localStorage.setItem("sidebarMinimized", val);
        setSidebarMinimized(val);
      }}
    />

    {/* ───────── Top Navigation ───────── */}
    <AdminTopNavBar
      sidebarMinimized={sidebarMinimized}
      setSidebarMinimized={setSidebarMinimized}
      onProfileClick={onProfileClick}
      onLogoutClick={onLogoutClick}
    />

    {/* ───────── Main Content ───────── */}
    <main
      className={`flex-1 overflow-y-auto pt-16 px-8 transition-all duration-300 ${
        sidebarMinimized ? "ml-[72px]" : "ml-[240px]"
      }`}
    >
      <div className="mt-6" />
      {children}
    </main>
  </div>
);

export default AdminLayout;
