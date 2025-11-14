// src/pages/teacher/MyQuizzes.jsx
import React, { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

import TeacherSidebar from "../../components/Sidebar";
import TeacherTopNavBar from "../../components/TeacherTopNavBar";

import { Eye } from "lucide-react";

export default function MyQuizzes() {
  /* ─────────────────────────────── State */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});

  const auth = getAuth();
  const navigate = useNavigate();

  /* Persist sidebar preference */
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", sidebarMinimized);
  }, [sidebarMinimized]);

  /* Fetch teacher-created quizzes */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return navigate("/");

      const snap = await getDocs(collection(db, "quizzes"));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (q) =>
            (q.created_by && q.created_by === user.uid) ||
            (q.createdBy && q.createdBy === user.uid),
        );

      setQuizzes(list);
      setLoading(false);
    });
    return () => unsub();
  }, [auth, navigate]);

  /* Expand handler – lazy-load question details */
  const handleExpand = async (quiz) => {
    if (expandedId === quiz.id) {
      setExpandedId(null);
      return;
    }
    if (!details[quiz.id]) {
      let qs = quiz.questions || [];
      if (qs.length === 0) {
        const qsSnap = await getDocs(
          collection(db, "quizzes", quiz.id, "questions"),
        );
        qs = qsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      setDetails((prev) => ({ ...prev, [quiz.id]: qs }));
    }
    setExpandedId(quiz.id);
  };

  /* Profile / logout */
  const handleProfile = () => navigate("/profile");
  const handleLogout  = () => signOut(auth).then(() => navigate("/"));

  /* ─────────────────────────────── UI */
  return (
    <>
      {/* Shared top-navigation bar */}
      <TeacherTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      {/* Layout */}
      <div className="flex h-screen pt-14 bg-gradient-to-br from-[#E8F6FF] to-[#D9F0FF] text-[#333]">
        <TeacherSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "pl-[88px]" : "pl-[256px]"
          } px-8 pt-8`}
        >
          <h2 className="mb-4 text-2xl font-semibold text-[#3A3A3A]">
            All Created Quizzes
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading quizzes...</p>
          ) : quizzes.length === 0 ? (
            <p className="text-sm text-gray-500">No quizzes found.</p>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="rounded-md border border-gray-200 bg-white shadow-sm"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="text-lg font-medium text-[#1D4F91]">
                        {quiz.title}
                      </h3>
                      <div className="mt-1 text-sm text-gray-600">
                        Difficulty:&nbsp;
                        <span className="capitalize">{quiz.difficulty}</span>
                        &nbsp;|&nbsp;Type:&nbsp;
                        <span className="uppercase font-semibold text-[#3399FF]">
                          {quiz.type === "manual" ? "Manual" : "AI Generated"}
                        </span>
                        &nbsp;|&nbsp;Questions:&nbsp;
                        {quiz.questionIds
                          ? quiz.questionIds.length
                          : quiz.questions?.length || 0}
                      </div>
                      {quiz.timestamp?.toDate && (
                        <div className="mt-1 text-xs text-gray-400">
                          Created:&nbsp;
                          {quiz.timestamp.toDate().toLocaleString()}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleExpand(quiz)}
                      className="flex items-center gap-1 rounded-md border border-[#3399FF] bg-white px-3 py-1 text-sm text-[#3399FF] hover:bg-[#E8F6FF]"
                    >
                      <Eye size={16} />
                      {expandedId === quiz.id ? "Hide" : "View"}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {expandedId === quiz.id && (
                    <div className="border-t border-gray-200 bg-[#F9FCFF] p-4">
                      {details[quiz.id]?.length ? (
                        <ol className="list-decimal space-y-2 pl-4">
                          {details[quiz.id].map((q) => {
                            const correct =
                              q.correctAnswer ??
                              q.correct ??
                              q.answer ??
                              "";
                            return (
                              <li key={q.id} className="leading-relaxed text-sm">
                                <div className="font-medium text-[#1D4F91]">
                                  {q.question}
                                </div>

                                {q.options && q.options.length ? (
                                  <ul className="ml-4 list-disc">
                                    {q.options.map((opt, idx) => (
                                      <li
                                        key={idx}
                                        className={
                                          opt === correct
                                            ? "font-semibold text-[#007654]"
                                            : ""
                                        }
                                      >
                                        {opt}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="ml-4 text-sm">
                                    {["true", "false"].includes(
                                      String(correct).toLowerCase(),
                                    ) ? (
                                      <span>
                                        <span
                                          className={
                                            String(
                                              correct,
                                            ).toLowerCase() === "true"
                                              ? "font-semibold text-[#007654]"
                                              : ""
                                          }
                                        >
                                          True
                                        </span>{" "}
                                        |{" "}
                                        <span
                                          className={
                                            String(
                                              correct,
                                            ).toLowerCase() === "false"
                                              ? "font-semibold text-[#007654]"
                                              : ""
                                          }
                                        >
                                          False
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">
                                        No options
                                      </span>
                                    )}
                                  </p>
                                )}

                                {correct && (
                                  <p className="mt-1 text-xs text-[#007654]">
                                    Correct Answer:&nbsp;
                                    <strong>{correct}</strong>
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No question details available.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
