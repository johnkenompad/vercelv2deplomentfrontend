/* --------------------------------------------------------------------------
   TeacherDashboard.jsx  – adds a fixed Top-Navigation Bar (“App Bar”)
   • Keeps sidebar & content layout exactly the same
   • Top bar is fixed, full-width, height-14; page content gets `pt-14`
   • No extra icons / “Create New” button re-added – stays minimal
----------------------------------------------------------------------------*/
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, getDocs, collectionGroup,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../firebase';
import Sidebar from '../../components/Sidebar';
import {
  Loader2, Pencil, Trash2, Eye, ChevronDown,
} from 'lucide-react';

export default function TeacherDashboard() {
  /* ──────────────────────────────────────────────────────────
     Local state
  ────────────────────────────────────────────────────────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem('sidebarMinimized') === 'true',
  );
  const [loading, setLoading]           = useState(true);
  const [quizzes, setQuizzes]           = useState([]);
  const [stats, setStats]               = useState({
    quizzesCreated   : 0,
    assignedQuizzes  : 0,
    studentsReached  : 0,
    averageScore     : 'N/A',
  });
  const [teacherUID, setTeacherUID]     = useState(null);
  const [authReady, setAuthReady]       = useState(false);

  const navigate = useNavigate();

  /* ──────────────────────────────────────────────────────────
     Auth listener
  ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      if (user) {
        setTeacherUID(user.uid);
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  /* ──────────────────────────────────────────────────────────
     Fetch stats + recent quizzes
  ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!authReady || !teacherUID) return;

      try {
        /* All quizzes */
        const allQuizzesSnap = await getDocs(collection(db, 'quizzes'));
        const allQuizzes     = allQuizzesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        /* Own quizzes only */
        const ownQuizzes = allQuizzes.filter(
          (q) => q.created_by?.trim?.() === teacherUID.trim(),
        );

        /* Recent 10 */
        const recentQuizzes = ownQuizzes
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 10);

        setQuizzes(recentQuizzes);

        /* Assignment + reach */
        let totalAssigned = 0;
        const studentSet   = new Set();
        let totalScore     = 0;
        let resultCount    = 0;

        for (const quiz of ownQuizzes) {
          const assignedSnap = await getDocs(
            collection(db, 'quizzes', quiz.id, 'assignedTo'),
          );
          totalAssigned += assignedSnap.size;
          assignedSnap.forEach((d) => studentSet.add(d.id));
        }

        /* Results (average score) */
        const resultsSnap = await getDocs(collectionGroup(db, 'results'));
        resultsSnap.forEach((doc) => {
          const data = doc.data();
          if (
            typeof data.score === 'number'
            && ownQuizzes.find((q) => q.id === data.quizId)
          ) {
            totalScore += data.score;
            resultCount += 1;
          }
        });

        const avgScore =
          resultCount > 0 ? `${(totalScore / resultCount).toFixed(2)} %` : 'N/A';

        setStats({
          quizzesCreated  : ownQuizzes.length,
          assignedQuizzes : totalAssigned,
          studentsReached : studentSet.size,
          averageScore    : avgScore,
        });
      } catch (err) {
        /* eslint-disable no-console */
        console.error('Dashboard fetch error →', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [authReady, teacherUID]);

  /* ──────────────────────────────────────────────────────────
     Helpers
  ────────────────────────────────────────────────────────── */
  const formatQuizType = (quizType) => {
    const types = Array.isArray(quizType)
      ? quizType
      : typeof quizType === 'string'
      ? quizType.split(/,\s*/).map((t) => t.toLowerCase())
      : [];

    const labels = [];
    if (types.includes('mc')) labels.push('MCQ');
    if (types.includes('tf')) labels.push('T/F');
    return labels.join(' · ') || '—';
  };

  const badge =
    (text, color) =>
      (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}
        >
          {text}
        </span>
      );

  /* ──────────────────────────────────────────────────────────
     Render
  ────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ---------------- Top Navigation Bar (App Bar) ---------------- */}
      <div className="fixed inset-x-0 top-0 z-50 h-14 bg-[#B76EF1] flex items-center justify-between px-6 text-white shadow">
        <span className="font-semibold">QuizRush • Teacher</span>
        {/* Right-side placeholder (e.g., profile name) – customize later */}
        <span className="text-sm opacity-90">Prof. QuizMaster</span>
      </div>

      {/* ---------------- Page layout below the top bar --------------- */}
      <div className="flex h-screen pt-14 bg-[#F6EFFC] text-[#5C517B]">
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
        />

        {/* Main */}
        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? 'ml-20' : 'ml-64'
          }`}
        >
          {/* Section header (kept minimal) */}
          <header className="px-8 py-6">
            <h1 className="text-2xl font-bold text-[#5C517B]">
              Teacher Dashboard
            </h1>
          </header>

          {/* Stat cards */}
          <section className="grid grid-cols-2 gap-4 px-8 pb-6 md:grid-cols-4">
            {[
              ['Quizzes Created', stats.quizzesCreated],
              ['Assigned Quizzes', stats.assignedQuizzes],
              ['Students Reached', stats.studentsReached],
              ['Avg. Score', stats.averageScore],
            ].map(([label, value]) => (
              <article
                key={label}
                className="flex flex-col items-center rounded-lg border border-[#EBD3FA] bg-white p-5 shadow-sm"
              >
                <span className="text-sm text-[#974EC3]">{label}</span>
                <span className="mt-1 text-2xl font-semibold text-[#B76EF1]">
                  {loading ? '—' : value}
                </span>
              </article>
            ))}
          </section>

          {/* Recent quizzes */}
          <section className="px-8 pb-12">
            <h2 className="mb-4 text-lg font-medium text-[#5C517B]">
              Recent Quizzes
            </h2>

            <div className="relative overflow-x-auto rounded-lg border border-[#EBD3FA] bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F4EAFE] text-left text-[#5C517B]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Difficulty</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="flex items-center justify-center py-10 text-center"
                      >
                        <Loader2 className="mr-2 animate-spin" size={18} />
                        Loading…
                      </td>
                    </tr>
                  ) : quizzes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-[#5C517B]/70"
                      >
                        No quizzes yet.
                      </td>
                    </tr>
                  ) : (
                    quizzes.map((quiz) => (
                      <tr
                        key={quiz.id}
                        className="border-t border-[#F1E8FF] hover:bg-[#FAF7FF]"
                      >
                        <td
                          className="max-w-[220px] truncate px-4 py-3 font-medium text-[#5C517B]"
                        >
                          {quiz.title}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {badge(
                            quiz.difficulty,
                            'bg-[#D7F9D0] text-[#285C2A]',
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {badge(
                            formatQuizType(quiz.quizType),
                            'bg-[#D3EAFE] text-[#1D4F91]',
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#5C517B]/80">
                          {quiz.createdAt
                            ? new Date(
                                quiz.createdAt.seconds * 1000,
                              ).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {badge(
                            quiz.published ? 'Published' : 'Draft',
                            quiz.published
                              ? 'bg-[#CFFDF1] text-[#007654]'
                              : 'bg-[#FFEFD5] text-[#996A00]',
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/quiz/${quiz.id}`)}
                              title="View"
                              className="rounded-md border border-[#EBD3FA] p-1.5 hover:bg-[#F7F1FF]"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => navigate(`/teacher/edit/${quiz.id}`)}
                              title="Edit"
                              className="rounded-md border border-[#EBD3FA] p-1.5 hover:bg-[#F7F1FF]"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => console.log('delete', quiz.id)}
                              title="Delete"
                              className="rounded-md border border-[#FFE2E2] p-1.5 hover:bg-[#FFF4F4]"
                            >
                              <Trash2 size={16} className="text-[#E63946]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Footer dropdown – page size (placeholder for future pagination) */}
              <footer className="flex items-center justify-between border-t border-[#F1E8FF] px-4 py-3 text-xs text-[#5C517B]/70">
                <span>
                  Showing&nbsp;
                  {Math.min(quizzes.length, 10)}
                  &nbsp;of&nbsp;
                  {quizzes.length}
                  &nbsp;results
                </span>
                <label className="flex items-center gap-1">
                  Rows&nbsp;
                  <select
                    className="rounded border border-[#EBD3FA] bg-transparent px-1 py-0.5 text-xs focus:outline-none"
                    defaultValue="10"
                    disabled
                  >
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                  <ChevronDown size={12} className="opacity-60" />
                </label>
              </footer>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
