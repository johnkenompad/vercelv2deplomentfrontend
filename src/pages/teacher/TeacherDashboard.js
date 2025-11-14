/* --------------------------------------------------------------------------
   TeacherDashboard.jsx – vivid-blue system, dynamic badges, polished UI
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  collectionGroup,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { db } from "../../firebase";

import Sidebar from "../../components/Sidebar";
import TeacherTopNavBar from "../../components/TeacherTopNavBar";

import {
  Loader2,
  Pencil,
  Trash2,
  Eye,
  ChevronDown,
} from "lucide-react";

export default function TeacherDashboard() {
  /* ───────────────────────────── State */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState({
    quizzesCreated : 0,
    assignedQuizzes: 0,
    studentsReached: 0,
    averageScore   : "N/A",
  });
  const [teacherUID, setTeacherUID] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  const navigate = useNavigate();
  const auth = getAuth();

  /* ───────────────────────────── Auth listener */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setTeacherUID(user.uid);
        setTeacherName(
          user.displayName || user.email?.split("@")[0] || "Teacher",
        );
        setAuthReady(true);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  /* ───────────────────────────── Fetch dashboard data */
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!authReady || !teacherUID) return;

      try {
        const allQuizzesSnap = await getDocs(collection(db, "quizzes"));
        const allQuizzes = allQuizzesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const ownQuizzes = allQuizzes.filter(
          (q) => q.created_by?.trim?.() === teacherUID.trim(),
        );

        const recentQuizzes = ownQuizzes
          .sort(
            (a, b) =>
              (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          )
          .slice(0, 10);

        setQuizzes(recentQuizzes);

        let totalAssigned = 0;
        const studentSet  = new Set();
        let totalScore    = 0;
        let resultCount   = 0;

        for (const quiz of ownQuizzes) {
          const assignedSnap = await getDocs(
            collection(db, "quizzes", quiz.id, "assignedTo"),
          );
          totalAssigned += assignedSnap.size;
          assignedSnap.forEach((d) => studentSet.add(d.id));
        }

        const resultsSnap = await getDocs(collectionGroup(db, "results"));
        resultsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            typeof data.score === "number" &&
            ownQuizzes.find((q) => q.id === data.quizId)
          ) {
            totalScore += data.score;
            resultCount += 1;
          }
        });

        const avgScore =
          resultCount > 0 ? `${(totalScore / resultCount).toFixed(2)} %` : "N/A";

        setStats({
          quizzesCreated : ownQuizzes.length,
          assignedQuizzes: totalAssigned,
          studentsReached: studentSet.size,
          averageScore   : avgScore,
        });
      } catch (err) {
        console.error("Dashboard fetch error →", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [authReady, teacherUID]);

  /* ───────────────────────────── Helpers */
  const formatQuizType = (quizType) => {
    const types = Array.isArray(quizType)
      ? quizType
      : typeof quizType === "string"
      ? quizType.split(/,\s*/).map((t) => t.toLowerCase())
      : [];
    const labels = [];
    if (types.includes("mc")) labels.push("MCQ");
    if (types.includes("tf")) labels.push("T/F");
    return labels.join(" · ") || "—";
  };

  const badge = (text, colorClass) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}
    >
      {text}
    </span>
  );

  const difficultyColor = (level = "") => {
    const diff = level.toLowerCase();
    if (diff === "easy")
      return "bg-[#D7F9D0] text-[#1E5F23]";
    if (diff === "medium")
      return "bg-[#FFF8E1] text-[#8B6000]";
    if (diff === "hard")
      return "bg-[#FFF4F4] text-[#E63946]";
    return "bg-[#E0F2FF] text-[#3399FF]";
  };

  /* ───────────────────────────── Handlers */
  const handleProfile = () => navigate("/profile");
  const handleLogout  = () => signOut(auth).then(() => navigate("/"));

  const filteredQuizzes =
    difficultyFilter === "All"
      ? quizzes
      : quizzes.filter(
          (q) =>
            (q.difficulty || "").toLowerCase() ===
            difficultyFilter.toLowerCase(),
        );

  /* ───────────────────────────── UI */
  return (
    <>
      {/* Global top navbar */}
      <TeacherTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      <div className="flex h-screen pt-14 bg-gradient-to-br from-[#E8F6FF] via-[#E0F2FF] to-[#D9F0FF] text-[#000000]">
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={(val) => {
            localStorage.setItem("sidebarMinimized", val);
            setSidebarMinimized(val);
          }}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          {/* ───────── Header ───────── */}
          <header className="px-8 py-7">
            <h1 className="text-3xl font-bold text-[#2A2A2A]">
              Teacher Dashboard
            </h1>
            <p className="mt-1 text-sm text-[#666666]">
              Welcome back, {teacherName}!
            </p>
          </header>

          {/* ───────── Stats Cards ───────── */}
          <section className="grid grid-cols-2 gap-5 px-8 pb-8 md:grid-cols-4">
            {[
              ["Quizzes Created", stats.quizzesCreated],
              ["Assigned Quizzes", stats.assignedQuizzes],
              ["Students Reached", stats.studentsReached],
              ["Average Score", stats.averageScore],
            ].map(([label, value]) => (
              <article
                key={label}
                className="flex flex-col items-center rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
              >
                <span className="text-sm font-medium text-[#555555]">
                  {label}
                </span>
                <span className="mt-2 text-3xl font-bold text-[#3399FF]">
                  {loading ? "—" : value}
                </span>
              </article>
            ))}
          </section>

          {/* ───────── Recent Quizzes Table ───────── */}
          <section className="px-8 pb-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#2A2A2A]">
                Recent Quizzes
              </h2>
              <label className="flex items-center gap-2 text-sm text-[#555555]">
                Filter:&nbsp;
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="cursor-pointer rounded-lg border border-[#DDDDDD] bg-white px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3399FF]/30"
                >
                  {["All", "Easy", "Medium", "Hard"].map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[#E0E0E0] bg-white shadow-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gradient-to-r from-[#E8F6FF] to-[#D9F0FF] text-left text-[#2A2A2A]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Title</th>
                      <th className="px-5 py-4 font-semibold">Difficulty</th>
                      <th className="px-5 py-4 font-semibold">Type</th>
                      <th className="px-5 py-4 font-semibold">Created</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 text-center font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <div className="flex items-center justify-center">
                            <Loader2
                              className="mr-2 animate-spin text-[#3399FF]"
                              size={20}
                            />
                            <span className="text-[#666666]">
                              Loading quizzes...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredQuizzes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-[#666666]"
                        >
                          No quizzes found. Create your first quiz to get
                          started!
                        </td>
                      </tr>
                    ) : (
                      filteredQuizzes.map((quiz) => (
                        <tr
                          key={quiz.id}
                          className="border-t border-[#F0F0F0] transition-colors hover:bg-[#F8FCFF]"
                        >
                          <td className="max-w-[240px] truncate px-5 py-4 font-semibold text-[#2A2A2A]">
                            {quiz.title}
                          </td>
                          <td className="px-5 py-4 capitalize">
                            {badge(
                              quiz.difficulty || "—",
                              difficultyColor(quiz.difficulty),
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {badge(
                              formatQuizType(quiz.quizType),
                              "bg-[#D3EAFE] text-[#1A4780]",
                            )}
                          </td>
                          <td className="px-5 py-4 text-[#555555]">
                            {quiz.createdAt
                              ? new Date(
                                  quiz.createdAt.seconds * 1000,
                                ).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-5 py-4">
                            {badge(
                              quiz.published ? "Published" : "Draft",
                              quiz.published
                                ? "bg-[#CFFDF1] text-[#00674A]"
                                : "bg-[#FFF4E0] text-[#8B6000]",
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => navigate(`/quiz/${quiz.id}`)}
                                title="View Quiz"
                                className="rounded-lg border border-[#E0E0E0] p-2 transition-all hover:border-[#3399FF] hover:bg-[#E8F6FF]"
                              >
                                <Eye size={17} className="text-[#3399FF]" />
                              </button>
                              <button
                                onClick={() =>
                                  navigate(`/teacher/edit/${quiz.id}`)
                                }
                                title="Edit Quiz"
                                className="rounded-lg border border-[#E0E0E0] p-2 transition-all hover:border-[#FFA726] hover:bg-[#FFF8E1]"
                              >
                                <Pencil size={17} className="text-[#FFA726]" />
                              </button>
                              <button
                                onClick={() => console.log("delete", quiz.id)}
                                title="Delete Quiz"
                                className="rounded-lg border border-[#FFE2E2] p-2 transition-all hover:border-[#E63946] hover:bg-[#FFF4F4]"
                              >
                                <Trash2 size={17} className="text-[#E63946]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <footer className="flex items-center justify-between border-t border-[#F0F0F0] bg-[#FAFAFA] px-5 py-3 text-xs text-[#666666]">
                <span className="font-medium">
                  Showing {Math.min(filteredQuizzes.length, 10)} of{" "}
                  {filteredQuizzes.length} results
                </span>
                <label className="flex items-center gap-2">
                  Rows per page:
                  <select
                    className="cursor-not-allowed rounded-md border border-[#DDDDDD] bg-white px-2 py-1 text-xs font-medium"
                    defaultValue="10"
                    disabled
                  >
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                  <ChevronDown size={14} className="opacity-50" />
                </label>
              </footer>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
