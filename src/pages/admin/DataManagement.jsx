/* --------------------------------------------------------------------------
   DataManagement.jsx – vivid-blue Admin Dashboard (with shared Top Nav)
   --------------------------------------------------------------------------*/
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

import AdminSidebar from "../../components/AdminSidebar";
import AdminTopNavBar from "../../components/AdminTopNavBar";

import {
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  FileText,
  UserRound,
  ChevronRight,
} from "lucide-react";

/* ───────────────────────────────── Management Modules ───────────────────────────────── */
const managementModules = [
  {
    id: "departments",
    title: "Departments",
    icon: Building2,
    description: "Manage academic departments and organizational structure",
    path: "/admin/departments",
  },
  {
    id: "courses",
    title: "Courses",
    icon: BookOpen,
    description: "Create and manage course curriculum",
    path: "/admin/courses",
  },
  {
    id: "classes",
    title: "Classes",
    icon: Users,
    description: "Organize and schedule student classes",
    path: "/admin/classes",
  },
  {
    id: "lecturers",
    title: "Lecturers",
    icon: UserRound,
    description: "Manage lecturer accounts and assignments",
    path: "/admin/lecturers",
  },
  {
    id: "students",
    title: "Students",
    icon: GraduationCap,
    description: "Manage student enrollments and profiles",
    path: "/admin/students",
  },
  {
    id: "questions",
    title: "Quiz Bank",
    icon: FileText,
    description: "Manage quiz questions and question pools",
    path: "/admin/questions",
  },
];

/* ─────────────────────────────────── Component ─────────────────────────────────── */
export default function DataManagement() {
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );

  const navigate = useNavigate();
  const auth = getAuth();

  /* ─────────────── Handlers ─────────────── */
  const handleProfile = () => navigate("/profile");
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };
  const handleModuleClick = (path) => navigate(path);

  /* ─────────────── Layout helpers ─────────────── */
  const mainMargin = sidebarMinimized ? "ml-[72px]" : "ml-[240px]";

  /* ─────────────── Render ─────────────── */
  return (
    <div className="flex h-screen bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
      {/* Sidebar */}
      <AdminSidebar
        minimized={sidebarMinimized}
        setSidebarMinimized={(val) => {
          localStorage.setItem("sidebarMinimized", val);
          setSidebarMinimized(val);
        }}
      />

      {/* Main Region */}
      <div
        className={`flex-1 overflow-y-auto transition-all duration-300 ${mainMargin}`}
      >
        {/* Shared Top Navigation Bar */}
        <AdminTopNavBar
          sidebarMinimized={sidebarMinimized}
          setSidebarMinimized={(val) => {
            localStorage.setItem("sidebarMinimized", val);
            setSidebarMinimized(val);
          }}
          onProfileClick={handleProfile}
          onLogoutClick={handleLogout}
        />

        {/* Page Content */}
        <main className="pt-20 pb-10 px-6 max-w-7xl mx-auto">
          {/* Heading */}
          <section className="mb-8">
            <h1 className="text-2xl font-bold text-[#2A2A2A] mb-1">
              Data Management
            </h1>
            <p className="text-[#333333]/70">
              Centralized control of QuizRush academic data
            </p>
          </section>

          {/* Management Module Cards */}
          <section className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
            {managementModules.map(
              ({ id, title, icon: Icon, description, path }) => (
                <button
                  key={id}
                  onClick={() => handleModuleClick(path)}
                  aria-label={`Manage ${title}`}
                  className="group text-left bg-white border border-[#DDDDDD] rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[#3399FF] transition-all"
                >
                  {/* Icon + Chevron */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-[#F3F8FC] group-hover:bg-[#3399FF] transition-colors">
                      <Icon className="w-6 h-6 text-[#3399FF] group-hover:text-white transition-colors" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#DDDDDD] group-hover:text-[#3399FF] transition-colors" />
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-lg font-semibold text-[#2A2A2A] mb-1 group-hover:text-[#3399FF] transition-colors">
                    {title}
                  </h2>
                  <p className="text-sm text-[#333333]/70 leading-relaxed">
                    {description}
                  </p>
                </button>
              ),
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
