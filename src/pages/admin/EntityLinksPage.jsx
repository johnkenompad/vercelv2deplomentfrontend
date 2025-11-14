import React, { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { User, LogOut } from "lucide-react";

/**
 * EntityLinksPage.jsx – vivid-blue QuizRush redesign
 * --------------------------------------------------------------------------
 *  • App Bar background  #3399FF   | Hover shade #2785E3
 *  • Brand ⚡ QuizRush + optional tagline
 *  • My Profile / Logout buttons
 *  • Dynamic padding-left (88 px ⇆ 256 px) tied to sidebar width
 * --------------------------------------------------------------------------
 */

const relationships = [
  {
    parent: "Users",
    relation: "1 → N",
    child: "Quizzes",
    key: "userId → teacherId",
    description: "A teacher (user) can create multiple quizzes.",
  },
  {
    parent: "Quizzes",
    relation: "1 → N",
    child: "Questions",
    key: "quizId → quizId",
    description: "Each quiz contains multiple questions.",
  },
  {
    parent: "Quizzes",
    relation: "M → N",
    child: "Users (Students)",
    key: "quizzes/[quizId]/assignedTo/[userId]",
    description: "A quiz can be assigned to multiple students via subcollection.",
  },
  {
    parent: "Users (Students)",
    relation: "1 → N",
    child: "Results",
    key: "userId → studentId",
    description: "Each student can have multiple quiz result records.",
  },
  {
    parent: "Results",
    relation: "1 → 1",
    child: "Quizzes",
    key: "quizId → quizId",
    description: "Each result is linked to one specific quiz.",
  },
];

export default function EntityLinksPage() {
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );

  const navigate = useNavigate();
  const auth     = getAuth();

  /* ────────────── Handlers ────────────── */
  const handleProfile = () => navigate("/profile");
  const handleLogout  = () => signOut(auth).then(() => navigate("/"));

  return (
    <div className="flex h-screen bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
      {/* 📚 Sidebar */}
      <AdminSidebar
        minimized={sidebarMinimized}
        setSidebarMinimized={(val) => {
          localStorage.setItem("sidebarMinimized", val);
          setSidebarMinimized(val);
        }}
      />

      {/* 📄 Main */}
      <div
        className={`flex-1 overflow-y-auto transition-all duration-300 pt-14 px-8 gap-4 ${
          sidebarMinimized ? "ml-[72px]" : "ml-[240px]"
        }`}
      >
        {/* 🔹 App Bar */}
        <header
          className="fixed top-0 left-0 right-0 h-14 bg-[#3399FF] text-white flex items-center justify-between shadow-sm z-40 select-none"
          style={{
            paddingLeft: sidebarMinimized ? "88px" : "256px",
            paddingRight: "24px",
            transition: "padding-left 300ms ease",
          }}
        >
          {/* Brand */}
          <span className="font-semibold flex items-center gap-1">
            <span className="text-lg">⚡</span>
            <span className="hidden sm:inline">QuizRush</span>
            <span className="hidden lg:inline">
              &nbsp;AI-Powered&nbsp;Quiz&nbsp;Generator
            </span>
          </span>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleProfile}
              className="flex items-center gap-2 bg-white text-[#3399FF] border border-[#3399FF] hover:bg-[#E8F6FF] text-sm font-medium px-4 py-1.5 rounded-md transition"
            >
              <User size={16} strokeWidth={2} /> My&nbsp;Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white text-[#3399FF] border border-[#3399FF] hover:bg-[#E8F6FF] text-sm font-medium px-4 py-1.5 rounded-md transition"
            >
              <LogOut size={16} strokeWidth={2} /> Logout
            </button>
          </div>
        </header>

        {/* Spacer below App Bar */}
        <div className="mt-6" />

        {/* Intro */}
        <section className="max-w-3xl mb-6">
          <p className="text-sm text-[#333333]/80">
            This page summarizes how core entities in QuizRush relate to each other—handy for database design, debugging, and analytics.
          </p>
        </section>

        {/* Relationship Table */}
        <section className="overflow-auto border border-[#DDDDDD] rounded-md shadow-sm bg-white mb-10">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-[#3399FF] text-white">
              <tr>
                <th className="px-4 py-3">Parent Entity</th>
                <th className="px-4 py-3">Relationship</th>
                <th className="px-4 py-3">Child Entity</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDDDDD]">
              {relationships.map((rel) => (
                <tr
                  key={rel.key}
                  className="hover:bg-[#D9F0FF] transition select-none"
                >
                  <td className="px-4 py-3 font-medium">{rel.parent}</td>
                  <td className="px-4 py-3 text-center">{rel.relation}</td>
                  <td className="px-4 py-3">{rel.child}</td>
                  <td className="px-4 py-3 text-xs text-[#333333]/60">
                    {rel.key}
                  </td>
                  <td className="px-4 py-3">{rel.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Diagram */}
        <section className="bg-white border border-[#DDDDDD] rounded-md p-6 shadow-sm max-w-4xl">
          <h2 className="text-lg font-semibold text-[#3A3A3A] mb-2">
            📊 Visual Entity Diagram
          </h2>
          <p className="text-sm text-[#333333]/70 mb-4">
            This diagram helps visualize how entities in QuizRush are connected in Firestore.
          </p>
          <div className="overflow-x-auto">
            <img
              src="/entity_relationship.png"
              alt="Entity Relationship Diagram"
              className="w-full rounded-md border border-[#DDDDDD] shadow-sm"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
