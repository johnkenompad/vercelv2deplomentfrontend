/* --------------------------------------------------------------------------
   ReportsPage.jsx – vivid-blue Teacher UI (unified TeacherTopNavBar)
---------------------------------------------------------------------------*/
import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "../../components/Sidebar";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  collectionGroup,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
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
} from "recharts";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import TeacherTopNavBar from "../../components/TeacherTopNavBar"; // unified app bar

/* chart palette */
const COLORS = ["#3399FF", "#2785E3", "#82ca9d", "#4A90E2", "#FFB84C"];

export default function ReportsPage() {
  /* ────────────────────────────────────────
     Local state
  ──────────────────────────────────────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [teacherUID, setTeacherUID]   = useState(null);
  const [teacherName, setTeacherName] = useState("Teacher");

  const [quizStats, setQuizStats]         = useState({
    students: 0,
    quizzes : 0,
    attempts: 0,
    avgScore: 0,
  });
  const [performanceData, setPerformance] = useState([]);
  const [leaderboard, setLeaderboard]     = useState([]);
  const [topScorersPerQuiz, setTop]       = useState([]);

  /* NEW table + filters */
  const [attemptRows, setAttemptRows] = useState([]);
  const [quizOptions, setQuizOptions] = useState([]);

  const [filterQuiz, setFilterQuiz]       = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterFrom, setFilterFrom]       = useState("");
  const [filterTo, setFilterTo]           = useState("");

  const navigate = useNavigate();
  const auth     = getAuth();

  /* ────────────────────────────────────────
     Auth listener
  ──────────────────────────────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setTeacherUID(u.uid);
        setTeacherName(u.displayName || u.email?.split("@")[0] || "Teacher");
      } else {
        navigate("/login");
      }
    });
    return () => unsub();
  }, [auth, navigate]);

  /* persist sidebar */
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", sidebarMinimized);
  }, [sidebarMinimized]);

  /* ────────────────────────────────────────
     Helper – resolve UID → nice display-name
  ──────────────────────────────────────── */
  const nameCache = {};
  const getDisplayName = async (uid, fallback = "Unknown") => {
    if (!uid) return fallback;
    if (nameCache[uid]) return nameCache[uid];
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const d = snap.data();
        const nice =
          d.displayName ||
          d.name        ||
          d.fullName    ||
          d.email       ||
          uid;
        nameCache[uid] = nice;
        return nice;
      }
    } catch (_) {}
    nameCache[uid] = fallback || uid;
    return nameCache[uid];
  };

  /* ────────────────────────────────────────
     Data fetch
  ──────────────────────────────────────── */
  useEffect(() => {
    if (!teacherUID) return;

    const fetchData = async () => {
      const quizSnap = await getDocs(
        query(collection(db, "quizzes"), where("created_by", "==", teacherUID)),
      );
      const quizzes   = quizSnap.docs;
      const resultsSS = await getDocs(collectionGroup(db, "results"));

      const studentScores   = {};
      const perfTemp        = [];
      const quizTopTemp     = [];
      const attemptsRowsTmp = [];
      const quizTitlesMap   = {};

      let totalAttempts = 0;
      let totalScoreSum = 0;
      let totalScoreCnt = 0;
      const allStudents  = new Set();

      /* map quizId -> title */
      quizzes.forEach((q) => {
        quizTitlesMap[q.id] = q.data().title || "Untitled Quiz";
      });

      /* gather attempts rows + leaderboard aggregates */
      for (const r of resultsSS.docs) {
        const res = r.data();
        if (!quizTitlesMap[res.quizId]) continue; // skip other teachers

        const rowName = await getDisplayName(
          res.studentId || res.userId || res.uid,
          "Anon",
        );

        allStudents.add(rowName);
        totalAttempts++;
        totalScoreSum += res.score;
        totalScoreCnt++;

        const percent = res.total
          ? Math.round((res.score / res.total) * 100)
          : 0;
        attemptsRowsTmp.push({
          id         : r.id,
          name       : rowName,
          quizTitle  : quizTitlesMap[res.quizId],
          score      : res.score,
          total      : res.total,
          percent,
          submittedAt: res.submittedAt?.toDate() || new Date(0),
        });

        /* leaderboard aggregate */
        if (!studentScores[rowName]) studentScores[rowName] = { tot: 0, cnt: 0 };
        studentScores[rowName].tot += res.score;
        studentScores[rowName].cnt += 1;
      }

      /* performance per quiz */
      for (const q of quizzes) {
        const qid   = q.id;
        const title = quizTitlesMap[qid];
        const scores = attemptsRowsTmp
          .filter((a) => a.quizTitle === title)
          .map((a) => a.score);
        const avg = scores.length
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
        perfTemp.push({
          title,
          attempts: scores.length,
          avg    : Math.round(avg),
        });

        if (scores.length) {
          const topRow = attemptsRowsTmp
            .filter((a) => a.quizTitle === title)
            .sort((a, b) => b.score - a.score)[0];
          quizTopTemp.push({
            quizTitle : title,
            name      : topRow.name,
            score     : topRow.percent,
          });
        }
      }

      /* leaderboard list */
      const leader = Object.entries(studentScores)
        .map(([name, s]) => ({
          name,
          avg  : Math.round(s.tot / s.cnt),
          taken: s.cnt,
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);

      /* quiz options for filter */
      const quizOpts = quizzes.map((q) => quizTitlesMap[q.id]).sort();

      /* push state */
      setQuizStats({
        students : allStudents.size,
        quizzes  : quizzes.length,
        attempts : totalAttempts,
        avgScore : totalScoreCnt
          ? Math.round(totalScoreSum / totalScoreCnt)
          : 0,
      });
      setPerformance(perfTemp);
      setLeaderboard(leader);
      setTop(quizTopTemp);
      setAttemptRows(attemptsRowsTmp);
      setQuizOptions(quizOpts);
    };

    fetchData();
  }, [teacherUID]);

  /* ────────────────────────────────────────
     Filters & Exports
  ──────────────────────────────────────── */
  const filteredRows = useMemo(() => {
    return attemptRows.filter((r) => {
      if (filterQuiz && r.quizTitle !== filterQuiz) return false;
      if (
        filterStudent &&
        !r.name.toLowerCase().includes(filterStudent.toLowerCase())
      )
        return false;
      if (filterFrom && r.submittedAt < new Date(filterFrom)) return false;
      if (filterTo && r.submittedAt > new Date(filterTo)) return false;
      return true;
    });
  }, [attemptRows, filterQuiz, filterStudent, filterFrom, filterTo]);

  const exportCSV = () => {
    const header = ["Student", "Quiz", "Score", "Total", "Percent", "Date"];
    const rows   = filteredRows.map((r) => [
      `"${r.name}"`,
      `"${r.quizTitle}"`,
      r.score,
      r.total,
      `${r.percent}%`,
      `"${r.submittedAt.toLocaleString()}"`,
    ]);
    const csvContent =
      [header.join(",")].concat(rows.map((a) => a.join(","))).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "quiz_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Quiz Results Report", 14, 16);
    const tableHeaders = [
      "Student",
      "Quiz",
      "Score",
      "Total",
      "Percent",
      "Date",
    ];
    const tableRows = filteredRows.map((r) => [
      r.name,
      r.quizTitle,
      r.score,
      r.total,
      `${r.percent}%`,
      r.submittedAt.toLocaleString(),
    ]);
    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 24,
      styles: { fontSize: 8 },
      headStyles: { fillColor: "#3399FF" },
    });
    doc.save("quiz_results.pdf");
  };

  /* ────────────────────────────────────────
     Top-bar handlers
  ──────────────────────────────────────── */
  const handleProfile = () => navigate("/profile");
  const handleLogout  = () => signOut(auth).then(() => navigate("/"));

  /* ────────────────────────────────────────
     UI
  ──────────────────────────────────────── */
  return (
    <>
      {/* -------- Top Navigation Bar -------- */}
      <TeacherTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      {/* -------- Layout -------- */}
      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
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
          } px-6 py-8`}
        >
          {/* ---------- Header ---------- */}
          <h1 className="mb-8 text-2xl font-bold text-[#3A3A3A]">
            Reports Summary
          </h1>

          {/* ---------- Stat cards ---------- */}
          <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {[["Total Students", quizStats.students], ["Total Quizzes", quizStats.quizzes], ["Total Attempts", quizStats.attempts], ["Avg Score", `${quizStats.avgScore}%`]].map(([label, val]) => (
              <article
                key={label}
                className="rounded-xl border border-[#DDDDDD] bg-white p-6 text-center shadow"
              >
                <h2 className="text-sm font-semibold text-[#3399FF]">
                  {label}
                </h2>
                <p className="mt-1 text-3xl font-bold text-[#2785E3]">
                  {val}
                </p>
              </article>
            ))}
          </section>

          {/* ---------- Charts ---------- */}
          <section className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-[#DDDDDD] bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-[#3A3A3A]">
                📘 Quiz Attempts &amp; Average Score
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <XAxis dataKey="title" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="attempts" fill="#3399FF" name="Attempts" />
                  <Bar dataKey="avg"      fill="#82ca9d" name="Avg Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-[#DDDDDD] bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-[#3A3A3A]">
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

          {/* ---------- Top scorer per quiz ---------- */}
          <section className="mt-8 rounded-xl border border-[#DDDDDD] bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-[#3A3A3A]">
              🏆 Top Scorer Per Quiz
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#E8F6FF] text-left">
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
                      className="border-t border-[#DDDDDD] hover:bg-[#EDF4FF]"
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

          {/* ---------- Filters + Attempts table ---------- */}
          <section className="mt-8 rounded-xl border border-[#DDDDDD] bg-white p-6 shadow">
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <h2 className="text-xl font-semibold text-[#3A3A3A]">
                Detailed Attempts
              </h2>
              <select
                value={filterQuiz}
                onChange={(e) => setFilterQuiz(e.target.value)}
                className="rounded border border-[#DDDDDD] bg-white px-3 py-1 text-sm"
              >
                <option value="">All Quizzes</option>
                {quizOptions.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Student name"
                value={filterStudent}
                onChange={(e) => setFilterStudent(e.target.value)}
                className="rounded border border-[#DDDDDD] bg-white px-3 py-1 text-sm"
              />
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="rounded border border-[#DDDDDD] bg-white px-3 py-1 text-sm"
              />
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="rounded border border-[#DDDDDD] bg-white px-3 py-1 text-sm"
              />
              <button
                onClick={exportCSV}
                className="ml-auto flex items-center gap-1 rounded border border-[#3399FF] bg-[#3399FF] px-3 py-1 text-sm font-medium text-white hover:bg-[#2785E3]"
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-1 rounded border border-[#3399FF] bg-[#3399FF] px-3 py-1 text-sm font-medium text-white hover:bg-[#2785E3]"
              >
                <Download size={14} /> Export PDF
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#E8F6FF] text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Student</th>
                    <th className="px-4 py-2 font-medium">Quiz</th>
                    <th className="px-4 py-2 font-medium">Score</th>
                    <th className="px-4 py-2 font-medium">Percent</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-[#DDDDDD] hover:bg-[#EDF4FF]"
                    >
                      <td className="px-4 py-2">
                        {r.submittedAt.toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2">{r.quizTitle}</td>
                      <td className="px-4 py-2">
                        {r.score}/{r.total}
                      </td>
                      <td className="px-4 py-2">{r.percent}%</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            r.percent >= 75
                              ? "bg-[#D7F9D0] text-[#285C2A]"
                              : "bg-[#FFE5E5] text-[#B91C1C]"
                          }`}
                        >
                          {r.percent >= 75 ? "Passed" : "Failed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-4 text-center text-[#666666]"
                      >
                        No attempts match current filters.
                      </td>
                    </tr>
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
