// src/components/AdminTopNavBar.jsx
import React from "react";
import NotificationBell from "./NotificationBell";
import { Menu, LogOut } from "lucide-react";

const AdminTopNavBar = ({
  sidebarMinimized,
  setSidebarMinimized,
  onLogoutClick,
}) => {
  const handleToggleSidebar = () => {
    const newState = !sidebarMinimized;
    localStorage.setItem("sidebarMinimized", newState);
    setSidebarMinimized(newState);
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 h-14 bg-[#3399FF] text-white shadow-sm transition-all duration-300"
      style={{
        paddingLeft: sidebarMinimized ? "88px" : "256px",
        paddingRight: "32px",
      }}
    >
      <div className="flex h-full items-center justify-between">
        {/* ───────── Left: Logo & sidebar toggle ───────── */}
        <div className="flex min-w-0 items-center gap-4">
          <button
            onClick={handleToggleSidebar}
            className="p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition md:hidden"
            aria-label={sidebarMinimized ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={20} strokeWidth={2.5} />
          </button>

          <span className="flex select-none items-center gap-2 truncate">
            <span className="text-2xl">⚡</span>
            <span className="truncate text-lg font-bold tracking-tight">
              QuizRush
            </span>
          </span>

          <span className="hidden xl:inline-flex items-center border-l border-white/30 pl-3 text-sm text-white/80">
            AI-Powered Quiz Generator
          </span>
        </div>

        {/* ───────── Right: Actions ───────── */}
        <div className="flex items-center gap-3">
          <NotificationBell />

          <span className="hidden h-8 w-px bg-white/25 sm:block" />

          <button
            onClick={onLogoutClick}
            className="flex items-center gap-2 bg-white text-[#3399FF] border border-[#3399FF] hover:bg-[#E8F6FF] text-sm font-medium px-4 py-1.5 rounded-md transition-colors"
          >
            <LogOut size={16} strokeWidth={2} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminTopNavBar;
