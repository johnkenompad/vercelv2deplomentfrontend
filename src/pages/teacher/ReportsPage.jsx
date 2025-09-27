/* --------------------------------------------------------------------------
   ReportsPage.jsx  – styled to match GenerateQuiz & TeacherDashboard
   • Adds the fixed purple App Bar
   • Re-uses sidebar layout, card, table, and color palette
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
  collectionGroup,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#8884d8', '#B76EF1', '#82ca9d', '#974EC3', '#FFB84C'];

export default function ReportsPage() {
  /* ────────────────────────────────────────
     Local state
  ──────────────────────────────────────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem('sidebarMinimized') === 'true',
  );
  const [teacherUID, setTeacherUID]       = useState(null);
  const [quizStats, setQuizStats]         = useState({
    students: 0,
    quizzes : 0,
    attempts: 0,
    avgScore: 0,
  });
  const [performanceData, setPerformance] = useState([]);
  const [leaderboard, setLeaderboard]     = useState([]);
  const [topScorersPerQuiz, setTop]       = useState([]);

  /* auth listener */
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => u && setTeacherUID(u.uid));
    return () => unsub();
  }, []);

  /* persist sidebar */
  useEffect(() => {
    localStorage.setItem('sidebarMinimized', sidebarMinimized);
  }, [sidebarMinimized]);

  /* data fetch */
  useEffect(() => {
    if (!teacherUID) return;

    const fetchData = async () => {
      const quizSnap = await getDocs(
        query(collection(db, 'quizzes'), where('created_by', '==', teacherUID)),
      );
      const quizzes     = quizSnap.docs;
      const resultsAll  = await getDocs(collectionGroup(db, 'results'));

      const studentScores = {};
      const perfTemp      = [];
      const quizTop       = [];

      let totalAttempts = 0;
      let totalScoreSum = 0;
      let totalScoreCnt = 0;
      const allStudents  = new Set();

      for (const q of quizzes) {
        const quizId   = q.id;
        const title    = q.data().title;
        const attempts = [];

        resultsAll.forEach((r) => {
          const res = r.data();
          if (res.quizId !== quizId || typeof res.score !== 'number') return;

          const userIdPath = r.ref.path.split('/')[1];
          const display    = res.name || res.email || userIdPath;

          allStudents.add(display);
          totalAttempts++;
          totalScoreSum += res.score;
          totalScoreCnt++;

          attempts.push({ ...res, name: display });

          if (!studentScores[display]) studentScores[display] = { tot: 0, cnt: 0 };
          studentScores[display].tot += res.score;
          studentScores[display].cnt += 1;
        });

        const scores = attempts.map((a) => a.score);
        const avg    = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        perfTemp.push({
          title,
          attempts: scores.length,
          avg    : Math.round(avg),
        });

        if (attempts.length) {
          const top = attempts.sort((a, b) => b.score - a.score)[0];
          quizTop.push({ quizTitle: title, name: top.name, score: top.score });
        }
      }

      const leader = Object.entries(studentScores)
        .map(([name, s]) => ({
          name,
          avg  : Math.round(s.tot / s.cnt),
          taken: s.cnt,
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);

      setQuizStats({
        students : allStudents.size,
        quizzes  : quizzes.length,
        attempts : totalAttempts,
        avgScore : totalScoreCnt ? Math.round(totalScoreSum / totalScoreCnt) : 0,
      });
      setPerformance(perfTemp);
      setLeaderboard(leader);
      setTop(quizTop);
    };

    fetchData();
  }, [teacherUID]);

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

      {/* -------- Layout -------- */}
      <div className="flex h-screen pt-14 bg-[#F6EFFC] text-[#5C517B]">
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? 'ml-20' : 'ml-64'
          } px-6 py-8`}
        >
          <h1 className="mb-8 text-2xl font-bold">Reports Summary</h1>

          {/* Stat cards */}
          <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {[
              ['Total Students', quizStats.students],
              ['Total Quizzes', quizStats.quizzes],
              ['Total Attempts', quizStats.attempts],
              ['Avg Score', `${quizStats.avgScore}%`],
            ].map(([label, val]) => (
              <article
                key={label}
                className="rounded-xl border border-[#EBD3FA] bg-white p-6 text-center shadow"
              >
                <h2 className="text-sm font-semibold text-[#974EC3]">{label}</h2>
                <p className="mt-1 text-3xl font-bold text-[#B76EF1]">{val}</p>
              </article>
            ))}
          </section>

          {/* Charts */}
          <section className="mt-8 grid gap-8 md:grid-cols-2">
            {/* Bar chart */}
            <div className="rounded-xl border border-[#EBD3FA] bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-[#974EC3]">
                📘 Quiz Attempts & Avg Score
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <XAxis dataKey="title" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="attempts" fill="#B76EF1" name="Attempts" />
                  <Bar dataKey="avg" fill="#8884d8" name="Avg Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="rounded-xl border border-[#EBD3FA] bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-[#974EC3]">
                🏅 Top Scoring Students
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leaderboard}
                    dataKey="avg"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {leaderboard.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Top scorer per quiz */}
          <section className="mt-8 rounded-xl border border-[#EBD3FA] bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-[#974EC3]">
              🏆 Top Scorer Per Quiz
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F4EAFE] text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Quiz Title</th>
                    <th className="px-4 py-2 font-medium">Student</th>
                    <th className="px-4 py-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topScorersPerQuiz.map((t) => (
                    <tr
                      key={t.quizTitle}
                      className="border-t border-[#F1E8FF] hover:bg-[#FAF7FF]"
                    >
                      <td className="px-4 py-2">{t.quizTitle}</td>
                      <td className="px-4 py-2 font-medium">{t.name}</td>
                      <td className="px-4 py-2">{t.score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
