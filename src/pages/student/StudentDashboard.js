/* --------------------------------------------------------------------------
   StudentDashboard.jsx – vivid-blue redesign (aligned to color system)
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

import StudentSidebar from "../../components/StudentSidebar";
import StudentTopNavBar from "../../components/StudentTopNavBar";

import { Loader2, Play } from "lucide-react";
import { toast } from "react-toastify";

export default function StudentDashboard() {
  /* ───────── state ───────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [loading, setLoading] = useState(true);
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  const [takenIds, setTakenIds] = useState([]);
  const [averageScore, setAverageScore] = useState("N/A");

  const auth     = getAuth();
  const navigate = useNavigate();

  /* ───────── auth listener ───────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => {});
    return () => unsub();
  }, [auth]);

  /* ───────── fetch data ───────── */
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        /* assigned quizzes */
        const quizSnap = await getDocs(collection(db, "quizzes"));
        const list = [];

        for (const q of quizSnap.docs) {
          const assignedRef = doc(
            db,
            "quizzes",
            q.id,
            "assignedTo",
            user.uid,
          );
          const asgSnap = await getDoc(assignedRef);
          if (asgSnap.exists()) {
            const asgData = asgSnap.data();

            /* 🔔 toast if new */
            if (asgData.isRead === false) {
              toast.success(`📝 New Quiz Assigned: “${q.data().title}”`, {
                autoClose: 4000,
              });
              await updateDoc(assignedRef, { isRead: true });
            }

            /* due date preference: explicit deadline > assignedAt */
            const dueDate =
              asgData.deadline ??
              asgData.assignedAt?.toDate()?.toISOString().split("T")[0] ??
              null;

            list.push({
              id   : q.id,
              ...q.data(),
              due  : dueDate ? new Date(dueDate).toLocaleDateString() : "—",
            });
          }
        }

        /* taken results */
        const resSnap = await getDocs(
          collection(db, `users/${user.uid}/results`),
        );
        let scoreSum = 0;
        let totalSum = 0;
        const done   = [];

        resSnap.forEach((r) => {
          const d = r.data();
          done.push(r.id);
          scoreSum += d.score;
          totalSum += d.total;
        });

        setAssignedQuizzes(list);
        setTakenIds(done);
        setAverageScore(
          totalSum ? `${((scoreSum / totalSum) * 100).toFixed(1)} %` : "N/A",
        );
      } catch (e) {
        console.error("Student dashboard fetch error →", e);
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [auth]);

  /* ───────── helpers ───────── */
  const badge = (text, bg, txt) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${bg} ${txt}`}
    >
      {text}
    </span>
  );

  /* ───────── handlers ───────── */
  const handleProfile = () => navigate("/profile");
  const handleLogout  = () => signOut(auth).then(() => navigate("/"));

  /* ───────── render ───────── */
  return (
    <>
      {/* 🌐 Global student top-navbar */}
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={(v) => {
          localStorage.setItem("sidebarMinimized", v);
          setSidebarMinimized(v);
        }}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      {/* layout */}
      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] via-[#E0F2FF] to-[#D9F0FF] text-[#000000]">
        <StudentSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={(v) => {
            localStorage.setItem("sidebarMinimized", v);
            setSidebarMinimized(v);
          }}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          {/* heading */}
          <header className="px-8 py-6">
            <h1 className="text-2xl font-bold text-[#2A2A2A]">
              Student Dashboard
            </h1>
          </header>

          {/* metric cards */}
          <section className="grid grid-cols-2 gap-4 px-8 pb-6 md:grid-cols-3">
            {[
              ["Quizzes Assigned", assignedQuizzes.length],
              ["Quizzes Taken",   takenIds.length],
              ["Average Score",   averageScore],
            ].map(([label, value]) => (
              <article
                key={label}
                className="flex flex-col items-center rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm"
              >
                <span className="text-sm text-[#2A2A2A]">{label}</span>
                <span className="mt-1 text-2xl font-semibold text-[#3399FF]">
                  {loading ? "—" : value}
                </span>
              </article>
            ))}
          </section>

          {/* assigned quiz table */}
          <section className="px-8 pb-12">
            <h2 className="mb-4 text-lg font-medium text-[#2A2A2A]">
              Your Assigned Quizzes
            </h2>

            <div className="relative overflow-x-auto rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-[#E8F6FF] text-left text-[#000000]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="flex items-center justify-center py-10 text-center"
                      >
                        <Loader2 className="mr-2 animate-spin text-[#666666]" size={18} />
                        Loading…
                      </td>
                    </tr>
                  ) : assignedQuizzes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-[#666666]"
                      >
                        No quizzes assigned yet.
                      </td>
                    </tr>
                  ) : (
                    assignedQuizzes.map((q) => (
                      <tr
                        key={q.id}
                        className="border-t border-[#F0F0F0] hover:bg-[#F8FCFF]"
                      >
                        <td className="max-w-[220px] truncate px-4 py-3 font-medium text-[#000000]">
                          {q.title}
                        </td>
                        <td className="px-4 py-3 text-[#555555]">
                          {q.due}
                        </td>
                        <td className="px-4 py-3">
                          {takenIds.includes(q.id)
                            ? badge(
                                "Completed",
                                "bg-[#CFFDF1]",
                                "text-[#00674A]",
                              )
                            : badge(
                                "Not Yet Taken",
                                "bg-[#D3EAFE]",
                                "text-[#1A4780]",
                              )}
                        </td>
                        <td className="px-4 py-2">
                          {takenIds.includes(q.id) ? (
                            <button
                              disabled
                              className="inline-flex items-center gap-1 rounded-md border border-[#E0E0E0] px-2 py-1 text-xs text-[#666666] opacity-60 cursor-default"
                            >
                              <Play size={14} /> Start
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                navigate("/take-quiz", {
                                  state: { quizId: q.id },
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-[#3399FF] px-2 py-1 text-xs font-medium text-[#3399FF] hover:bg-[#E8F6FF]"
                            >
                              <Play size={14} /> Start
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
