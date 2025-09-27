/* --------------------------------------------------------------------------
   StudentProgress.jsx  – styled to match GenerateQuiz & TeacherDashboard
   • Adds fixed purple App Bar
   • Re-uses sidebar layout, card, table, and color palette
   • Removes extra header icons for a clean, cohesive look
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import Sidebar from '../../components/Sidebar';

export default function StudentProgress() {
  /* ────────────────────────────────────────
     Local state
  ──────────────────────────────────────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem('sidebarMinimized') === 'true',
  );
  const [authReady, setAuthReady]     = useState(false);
  const [studentFilter, setStuFilter] = useState('');
  const [quizSearch, setQuizSearch]   = useState('');
  const [groupedResults, setGrouped]  = useState({});
  const [expanded, setExpanded]       = useState({});
  const [loading, setLoading]         = useState(true);

  const navigate = useNavigate();

  /* ────────────────────────────────────────
     Auth listener
  ──────────────────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) => {
      if (!user) navigate('/login');
      else setAuthReady(true);
    });
    return () => unsub();
  }, [navigate]);

  /* Persist sidebar */
  useEffect(() => {
    localStorage.setItem('sidebarMinimized', sidebarMinimized);
  }, [sidebarMinimized]);

  /* ────────────────────────────────────────
     Fetch results
  ──────────────────────────────────────── */
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const grouped   = {};

        for (const userDoc of usersSnap.docs) {
          const uid   = userDoc.id;
          const uData = userDoc.data();
          const uName = uData.name || uData.email || 'Unnamed';

          const resultsSnap = await getDocs(collection(db, `users/${uid}/results`));
          for (const rDoc of resultsSnap.docs) {
            const { quizId, score, total, submittedAt, attemptNumber } = rDoc.data();
            if (!quizId || score == null || total == null || !submittedAt) continue;

            const quizDoc   = await getDoc(doc(db, 'quizzes', quizId));
            const quizTitle = quizDoc.exists() ? quizDoc.data().title || 'Untitled Quiz' : 'Untitled Quiz';
            const dateStr   = submittedAt.toDate().toISOString().split('T')[0];

            const key = `${uName}_${quizTitle}`;
            if (!grouped[key])
              grouped[key] = { student: uName, quiz: quizTitle, attempts: [] };

            grouped[key].attempts.push({
              score : `${Math.round((score / total) * 100)}%`,
              date  : dateStr,
              attemptNumber: attemptNumber || 1,
            });
          }
        }

        /* sort attempts newest → oldest */
        Object.values(grouped).forEach((e) =>
          e.attempts.sort((a, b) => b.attemptNumber - a.attemptNumber),
        );

        setGrouped(grouped);
        setLoading(false);
      } catch (err) {
        console.error('🔥 Fetch error:', err);
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  /* ────────────────────────────────────────
     Helpers
  ──────────────────────────────────────── */
  const toggleExpand = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const filteredKeys = Object.keys(groupedResults).filter((key) => {
    const { student, quiz } = groupedResults[key];
    return (
      (!studentFilter || student.toLowerCase().includes(studentFilter.toLowerCase())) &&
      (!quizSearch || quiz === quizSearch)
    );
  });

  if (!authReady) return null;

  /* ────────────────────────────────────────
     UI
  ──────────────────────────────────────── */
  return (
    <>
      {/* -------- Top Navigation Bar -------- */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between bg-[#B76EF1] px-6 text-white shadow">
        <span className="font-semibold">QuizRush • Teacher</span>
        <span className="text-sm opacity-90">Prof. QuizMaster</span>
      </div>

      {/* -------- Page layout -------- */}
      <div className="flex h-screen pt-14 bg-[#F6EFFC] text-[#5C517B]">
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? 'ml-20' : 'ml-64'
          }`}
        >
          {/* Header */}
          <header className="px-10 pt-8 pb-4">
            <h1 className="text-2xl font-bold">Student Progress Tracker</h1>
          </header>

          {/* Card */}
          <div className="mx-auto mb-12 max-w-5xl rounded-xl border border-[#EBD3FA] bg-white p-8 shadow">
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="w-full md:max-w-xs">
                <label className="block text-sm font-semibold">
                  Search Student Name
                </label>
                <input
                  type="text"
                  value={studentFilter}
                  onChange={(e) => setStuFilter(e.target.value)}
                  placeholder="e.g., Juan Dela Cruz"
                  className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
                />
              </div>
              <div className="w-full md:max-w-xs">
                <label className="block text-sm font-semibold">
                  Select Quiz Title
                </label>
                <select
                  value={quizSearch}
                  onChange={(e) => setQuizSearch(e.target.value)}
                  className="mt-1 w-full rounded border border-[#D6BBF8] p-2 bg-[#F6EFFC]"
                >
                  <option value="">All Quizzes</option>
                  {Array.from(new Set(Object.values(groupedResults).map((r) => r.quiz))).map(
                    (q, i) => (
                      <option key={i} value={q}>
                        {q}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F4EAFE] text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Student</th>
                    <th className="px-4 py-2 font-medium">Quiz Title</th>
                    <th className="px-4 py-2 font-medium">Attempts</th>
                    <th className="px-4 py-2 font-medium">View</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeys.map((key) => {
                    const entry = groupedResults[key];
                    return (
                      <React.Fragment key={key}>
                        <tr className="border-t border-[#F1E8FF] hover:bg-[#FAF7FF]">
                          <td className="px-4 py-2">{entry.student}</td>
                          <td className="px-4 py-2">{entry.quiz}</td>
                          <td className="px-4 py-2">{entry.attempts.length}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => toggleExpand(key)}
                              className="rounded border border-[#EBD3FA] px-3 py-1 text-xs font-medium text-[#974EC3] hover:bg-[#F7F1FF]"
                            >
                              {expanded[key] ? 'Hide' : 'Show'}
                            </button>
                          </td>
                        </tr>
                        {expanded[key] && (
                          <tr className="border-t border-[#F1E8FF] bg-[#F9F8FF]">
                            <td colSpan={4} className="px-4 py-3">
                              <ul className="ml-5 list-disc">
                                {entry.attempts.map((a) => (
                                  <li key={a.attemptNumber}>
                                    Attempt #{a.attemptNumber}: {a.score} on {a.date}
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
              <p className="mt-4 text-center text-[#5C517B]/70">Loading…</p>
            ) : filteredKeys.length === 0 ? (
              <p className="mt-4 text-center text-[#5C517B]/70">
                No records found.
              </p>
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
}
