/* --------------------------------------------------------------------------
   ResultsPage.jsx – student-side quiz results (professional table view)
   --------------------------------------------------------------------------
   • Uses shared StudentTopNavBar for global header
   • Dynamic difficulty filter (All / Easy / Medium / Hard)
   • Mirrors StudentProgress styling for consistency
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getDocs,
  collection,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

import StudentSidebar from "../../components/StudentSidebar";
import StudentTopNavBar from "../../components/StudentTopNavBar";

export default function ResultsPage() {
  /* ───────────────────────────────── State */
  const [quizResults, setQuizResults] = useState({});
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  const navigate = useNavigate();
  const auth = getAuth();

  /* ───────────────────────────────── Auth */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
    });
    return () => unsub();
  }, [auth, navigate]);

  /* ───────────────────────────────── Fetch results */
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const resRef = collection(db, `users/${user.uid}/results`);
        const quizSnaps = await getDocs(resRef);
        const all = {};

        for (const snap of quizSnaps.docs) {
          const quizId = snap.id;
          let title = "Untitled Quiz";
          let quizVisible = true;
          let difficulty = "Unspecified";

          try {
            const qSnap = await getDoc(doc(db, "quizzes", quizId));
            if (qSnap.exists()) {
              const qData = qSnap.data();
              title = qData.title || title;
              quizVisible =
                qData.visibleToStudents === undefined
                  ? true
                  : qData.visibleToStudents;
              difficulty = qData.difficulty || difficulty;
            }
          } catch (err) {
            console.error("Quiz meta error:", err);
          }

          const attRef = collection(
            db,
            `users/${user.uid}/results/${quizId}/attempts`,
          );
          const attSnaps = await getDocs(attRef);
          const attempts = attSnaps.docs
            .map((d) => {
              const data = d.data();
              const percent = data.total
                ? Math.round((data.score / data.total) * 100)
                : 0;
              return {
                id: d.id,
                score: data.score,
                total: data.total,
                percent,
                pass: percent >= 75,
                submittedAt:
                  data.submittedAt?.toDate().toLocaleString() || "Unknown",
                visibleToStudent:
                  data.visibleToStudent === undefined
                    ? true
                    : data.visibleToStudent,
              };
            })
            .filter((a) => a.visibleToStudent !== false);

          if (attempts.length === 0) {
            const legacy = snap.data();
            const percent = legacy.total
              ? Math.round((legacy.score / legacy.total) * 100)
              : 0;
            attempts.push({
              id: "default",
              score: legacy.score || 0,
              total: legacy.total || 0,
              percent,
              pass: percent >= 75,
              submittedAt:
                legacy.submittedAt?.toDate().toLocaleString() || "Unknown",
              visibleToStudent: true,
            });
          }

          attempts.sort(
            (a, b) =>
              new Date(b.submittedAt).getTime() -
              new Date(a.submittedAt).getTime(),
          );

          all[quizId] = { quizTitle: title, quizVisible, difficulty, attempts };
        }

        setQuizResults(all);
      } catch (err) {
        console.error("🔥 Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [auth]);

  /* ───────────────────────────────── Helpers */
  const toggleExpand = (key) =>
    setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const visibleQuizIds = Object.keys(quizResults).filter(
    (id) =>
      quizResults[id].quizVisible &&
      (difficultyFilter === "All" ||
        quizResults[id].difficulty === difficultyFilter),
  );

  /* ───────────────────────────────── Handlers */
  const handleProfile = () => navigate("/profile");
  const handleLogout = () => signOut(auth).then(() => navigate("/"));
  const handleReview = (quizId, attemptId, totalAttempts) => {
    // Check if student has attempts remaining
    if (totalAttempts < 3) {
      const attemptsLeft = 3 - totalAttempts;
      alert(`⚠️ You can only view answers after using all 3 attempts. You have ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining.`);
      return;
    }
    
    // Navigate to take-quiz with state to trigger review mode
    navigate("/take-quiz", { 
      state: { 
        reviewQuizId: quizId, 
        reviewAttemptId: attemptId 
      } 
    });
  };

  /* ───────────────────────────────── UI */
  return (
    <>
      {/* Global student top-navbar */}
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
        {/* Sidebar */}
        <StudentSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={(val) => {
            localStorage.setItem("sidebarMinimized", val);
            setSidebarMinimized(val);
          }}
        />

        {/* Main */}
        <div
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-[72px] px-6" : "ml-[240px] px-10"
          }`}
        >
          {/* Page heading */}
          <header className="flex flex-col gap-4 pb-4 pt-8 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-2xl font-bold text-[#3A3A3A]">
              My Quiz Results
            </h1>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="difficulty"
                className="text-sm font-medium"
              >
                Difficulty:
              </label>
              <select
                id="difficulty"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="rounded-md border border-[#DDDDDD] bg-white px-3 py-1 text-sm shadow-sm hover:border-[#999]"
              >
                <option>All</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
          </header>

          {/* Card */}
          <div className="mx-auto mb-12 max-w-4xl rounded-xl border border-[#DDDDDD] bg-white p-8 shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#E8F6FF] text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Quiz Title</th>
                    <th className="px-4 py-2 font-medium">Difficulty</th>
                    <th className="px-4 py-2 font-medium">Attempts</th>
                    <th className="px-4 py-2 font-medium">Latest Score</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">View</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleQuizIds.map((id) => {
                    const quiz = quizResults[id];
                    const latest = quiz.attempts[0];
                    const passed = latest.pass;
                    const diffBadge =
                      quiz.difficulty === "Easy"
                        ? "bg-[#D7F9D0] text-[#285C2A]"
                        : quiz.difficulty === "Medium"
                        ? "bg-[#FFF7D6] text-[#996A00]"
                        : quiz.difficulty === "Hard"
                        ? "bg-[#FFE5E5] text-[#B91C1C]"
                        : "bg-[#E0E0E0] text-[#555555]";
                    return (
                      <React.Fragment key={id}>
                        <tr className="border-t border-[#DDDDDD] hover:bg-[#EDF4FF]">
                          <td className="px-4 py-2">{quiz.quizTitle}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${diffBadge}`}
                            >
                              {quiz.difficulty}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {quiz.attempts.length}
                          </td>
                          <td className="px-4 py-2 font-medium">
                            {latest.percent}%
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                passed
                                  ? "bg-[#D7F9D0] text-[#285C2A]"
                                  : "bg-[#FFE5E5] text-[#B91C1C]"
                              }`}
                            >
                              {passed ? "Passed" : "Failed"}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => toggleExpand(id)}
                              className="rounded border border-[#DDDDDD] px-3 py-1 text-xs font-medium text-[#3399FF] hover:bg-[#F0F8FF]"
                            >
                              {expanded[id] ? "Hide" : "Show"}
                            </button>
                          </td>
                        </tr>
                        {expanded[id] && (
                          <tr className="border-t border-[#DDDDDD] bg-[#F9FCFF]">
                            <td colSpan={6} className="px-4 py-3">
                              <ul className="ml-5 list-disc space-y-1">
                                {quiz.attempts.map((a, idx) => (
                                  <li
                                    key={a.id}
                                    className="flex flex-wrap items-center gap-2"
                                  >
                                    <span>
                                      Attempt {idx + 1}: {a.score}/{a.total} (
                                      {a.percent}%)
                                    </span>
                                    <span
                                      className={
                                        a.pass
                                          ? "font-semibold text-[#285C2A]"
                                          : "font-semibold text-[#B91C1C]"
                                      }
                                    >
                                      {a.pass ? "Passed" : "Failed"}
                                    </span>
                                    <span className="text-xs text-[#555555]">
                                      • {a.submittedAt}
                                    </span>
                                    {quiz.quizVisible &&
                                      a.visibleToStudent && (
                                        <button
                                          onClick={() =>
                                            handleReview(id, a.id, quiz.attempts.length)
                                          }
                                          disabled={quiz.attempts.length < 3}
                                          className={`ml-auto rounded border px-2 py-0.5 text-xs font-medium ${
                                            quiz.attempts.length < 3
                                              ? "cursor-not-allowed border-gray-300 bg-gray-200 text-gray-500"
                                              : "border-[#3399FF] bg-[#3399FF] text-white hover:bg-[#2785E3]"
                                          }`}
                                        >
                                          Review Answers
                                          {quiz.attempts.length < 3 && (
                                            <span className="block text-[10px]">
                                              ({3 - quiz.attempts.length} left)
                                            </span>
                                          )}
                                        </button>
                                      )}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {loading ? (
              <p className="mt-4 text-center text-[#666666]">Loading…</p>
            ) : visibleQuizIds.length === 0 ? (
              <p className="mt-4 text-center text-[#666666]">
                No quiz results available.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
