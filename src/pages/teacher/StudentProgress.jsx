/* --------------------------------------------------------------------------
   StudentProgress.jsx – vivid-blue Teacher UI (ENHANCED & FIXED)
   ✅ Statistics dashboard with visual metrics
   ✅ Advanced filtering and sorting options
   ✅ Data visualization-ready scaffolding
   ✅ CSV export for reports
   ✅ Loading states, error handling, and expandable details
---------------------------------------------------------------------------*/
import React, { useEffect, useState, useMemo, useCallback } from "react";
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
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";

import Sidebar from "../../components/Sidebar";
import TeacherTopNavBar from "../../components/TeacherTopNavBar";

import {
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Users,
  TrendingUp,
  Award,
  BarChart3,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";

export default function StudentProgress() {
  /* ───────── state ───────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [teacherName, setTeacherName] = useState("Teacher");

  const [studentFilter, setStuFilter] = useState("");
  const [quizSearch, setQuizSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("student");
  const [groupedResults, setGrouped] = useState({});
  const [expandedRow, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();

  /* ───────── auth listener ───────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          const fullName = [d.firstName, d.middleName, d.lastName]
            .filter(Boolean)
            .join(" ");
          setTeacherName(
            fullName ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "Teacher",
          );
        } else {
          setTeacherName(
            user.displayName || user.email?.split("@")[0] || "Teacher",
          );
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setTeacherName(
          user.displayName || user.email?.split("@")[0] || "Teacher",
        );
      }

      setAuthReady(true);
    });
    return () => unsub();
  }, [auth, navigate]);

  /* persist sidebar pref */
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", sidebarMinimized);
  }, [sidebarMinimized]);

  /* ───────── fetch data ───────── */
  const fetchResults = useCallback(
    async (showToast = false) => {
      if (!currentUser) return;
      
      const isRefresh = !loading;
      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        // First, get all quizzes created by this teacher
        const teacherQuizzesQuery1 = collection(db, "quizzes");
        const teacherQuizzesSnap1 = await getDocs(teacherQuizzesQuery1);
        
        const teacherQuizIds = new Set();
        
        // Get quizzes created by this teacher (using both field names)
        teacherQuizzesSnap1.docs.forEach((doc) => {
          const data = doc.data();
          if (data.created_by === currentUser.uid || data.createdBy === currentUser.uid) {
            teacherQuizIds.add(doc.id);
          }
        });

        if (teacherQuizIds.size === 0) {
          setGrouped({});
          setLoading(false);
          setRefreshing(false);
          if (showToast) toast.info("You haven't created any quizzes yet.");
          return;
        }

        // Now fetch results only for students who have been assigned these quizzes
        const usersSnap = await getDocs(collection(db, "users"));
        const grouped = {};

        for (const userDoc of usersSnap.docs) {
          const uid = userDoc.id;
          const uData = userDoc.data();
          const uName =
            uData.displayName ||
            uData.name ||
            [uData.firstName, uData.middleName, uData.lastName]
              .filter(Boolean)
              .join(" ") ||
            uData.email ||
            "Unnamed";

          const resultsSnap = await getDocs(
            collection(db, `users/${uid}/results`),
          );

          for (const resDoc of resultsSnap.docs) {
            const quizId = resDoc.id;
            
            // Only process if this quiz was created by the current teacher
            if (!teacherQuizIds.has(quizId)) continue;

            // Check if this student was assigned this quiz
            const assignmentDoc = await getDoc(
              doc(db, `quizzes/${quizId}/assignedTo/${uid}`)
            );
            
            // Skip if student wasn't assigned this quiz by this teacher
            if (!assignmentDoc.exists()) continue;

            /* quiz meta */
            const quizDoc = await getDoc(doc(db, "quizzes", quizId));
            const quizTitle = quizDoc.exists()
              ? quizDoc.data().title || "Untitled Quiz"
              : "Untitled Quiz";
            const quizDifficulty = quizDoc.exists()
              ? quizDoc.data().difficulty || "Unspecified"
              : "Unspecified";

            /* attempts */
            const attemptsSnap = await getDocs(
              collection(db, `users/${uid}/results/${quizId}/attempts`),
            );
            if (attemptsSnap.empty) continue;

            const key = `${uid}_${quizId}`;
            if (!grouped[key]) {
              grouped[key] = {
                studentId: uid,
                student: uName,
                quiz: quizTitle,
                quizDifficulty,
                attempts: [],
              };
            }

            attemptsSnap.forEach((aDoc) => {
              const aData = aDoc.data();
              const percent = aData.total
                ? Math.round((aData.score / aData.total) * 100)
                : 0;

              grouped[key].attempts.push({
                id: aDoc.id,
                percent,
                score: `${aData.score}/${aData.total}`,
                scoreNum: aData.score,
                totalNum: aData.total,
                pass: percent >= 75,
                date: aData.submittedAt?.toDate() || new Date(),
                dateStr:
                  aData.submittedAt?.toDate().toISOString().split("T")[0] ||
                  "Unknown",
                attemptNumber:
                  aData.attemptNumber || grouped[key].attempts.length + 1,
                answers: aData.answers || [],
              });
            });
          }
        }

        /* sort attempts (latest first) */
        Object.values(grouped).forEach((e) =>
          e.attempts.sort((a, b) => b.attemptNumber - a.attemptNumber),
        );

        setGrouped(grouped);
        if (showToast) toast.success("Progress data refreshed successfully!");
      } catch (err) {
        console.error("🔥 Fetch error:", err);
        toast.error("Failed to load student progress. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loading, currentUser],
  );

  useEffect(() => {
    if (authReady) fetchResults();
  }, [authReady, fetchResults]);

  /* ───────── statistics ───────── */
  const statistics = useMemo(() => {
    const entries = Object.values(groupedResults);
    const uniqueStudents = new Set(entries.map((e) => e.studentId)).size;
    const totalAttempts = entries.reduce(
      (sum, e) => sum + e.attempts.length,
      0,
    );
    const allAttempts = entries.flatMap((e) => e.attempts);
    const passed = allAttempts.filter((a) => a.pass).length;
    const passRate = totalAttempts
      ? Math.round((passed / totalAttempts) * 100)
      : 0;
    const avgScore = totalAttempts
      ? Math.round(
          allAttempts.reduce((sum, a) => sum + a.percent, 0) / totalAttempts,
        )
      : 0;

    return { uniqueStudents, totalAttempts, passRate, avgScore };
  }, [groupedResults]);

  /* ───────── filters / sorting ───────── */
  const filteredAndSortedKeys = useMemo(() => {
    let keys = Object.keys(groupedResults).filter((key) => {
      const { student, quiz, attempts } = groupedResults[key];
      const latestAttempt = attempts[0];

      const studentMatch =
        !studentFilter ||
        student.toLowerCase().includes(studentFilter.toLowerCase());
      const quizMatch = !quizSearch || quiz === quizSearch;
      const statusMatch =
        statusFilter === "All" ||
        (statusFilter === "Passed" && latestAttempt.pass) ||
        (statusFilter === "Failed" && !latestAttempt.pass);

      return studentMatch && quizMatch && statusMatch;
    });

    keys.sort((a, b) => {
      const A = groupedResults[a];
      const B = groupedResults[b];
      switch (sortBy) {
        case "student":
          return A.student.localeCompare(B.student);
        case "quiz":
          return A.quiz.localeCompare(B.quiz);
        case "score":
          return B.attempts[0].percent - A.attempts[0].percent;
        case "attempts":
          return B.attempts.length - A.attempts.length;
        default:
          return 0;
      }
    });

    return keys;
  }, [groupedResults, studentFilter, quizSearch, statusFilter, sortBy]);

  /* ───────── helpers ───────── */
  const toggleExpand = (key) =>
    setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const getDifficultyColor = (d) => {
    switch (d) {
      case "Easy":
        return "bg-green-50 text-green-700 border-green-200";
      case "Medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Hard":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getScoreColor = (p) => {
    if (p >= 90) return "text-green-600";
    if (p >= 75) return "text-blue-600";
    if (p >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const exportToCSV = () => {
    const headers = [
      "Student",
      "Quiz",
      "Attempt",
      "Score",
      "Percentage",
      "Status",
      "Date",
    ];
    const rows = filteredAndSortedKeys.flatMap((key) => {
      const entry = groupedResults[key];
      return entry.attempts.map((a) => [
        entry.student,
        entry.quiz,
        `#${a.attemptNumber}`,
        a.score,
        `${a.percent}%`,
        a.pass ? "Passed" : "Failed",
        a.dateStr,
      ]);
    });

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student-progress-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully!");
  };

  /* ───────── handlers ───────── */
  const handleProfile = () => navigate("/profile");
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to logout");
    }
  };
  const handleRefresh = () => fetchResults(true);

  if (!authReady) return null;

  /* ───────── UI ───────── */
  return (
    <>
      {/* Global top-navbar */}
      <TeacherTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      {/* Layout */}
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
          }`}
        >
          {/* Page header */}
          <header className="px-10 pt-8 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[#3A3A3A] mb-1">
                  Student Progress Tracker
                </h1>
                <p className="text-[#666666]">
                  Monitor student performance across all quizzes
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 bg-white text-[#3399FF] border border-[#3399FF] hover:bg-[#E8F6FF] disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-md shadow-sm transition"
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={!filteredAndSortedKeys.length}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] hover:from-[#2A8AEE] hover:to-[#4BA0EE] text-white disabled:opacity-50 text-sm font-semibold px-4 py-2 rounded-md shadow-md transition"
                >
                  <Download size={16} /> Export CSV
                </button>
              </div>
            </div>
          </header>

          {/* Stats */}
          <div className="px-10 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl">
              {/* Total students */}
              <div className="bg-white p-5 rounded-lg shadow-md border border-[#DDDDDD]">
                <div className="bg-blue-50 p-2 rounded-lg w-fit mb-2">
                  <Users size={24} className="text-[#3399FF]" />
                </div>
                <p className="text-sm text-[#666666] mb-1">Total Students</p>
                <p className="text-3xl font-bold text-[#3A3A3A]">
                  {statistics.uniqueStudents}
                </p>
              </div>

              {/* Total attempts */}
              <div className="bg-white p-5 rounded-lg shadow-md border border-[#DDDDDD]">
                <div className="bg-purple-50 p-2 rounded-lg w-fit mb-2">
                  <BarChart3 size={24} className="text-purple-600" />
                </div>
                <p className="text-sm text-[#666666] mb-1">Total Attempts</p>
                <p className="text-3xl font-bold text-[#3A3A3A]">
                  {statistics.totalAttempts}
                </p>
              </div>

              {/* Pass rate */}
              <div className="bg-white p-5 rounded-lg shadow-md border border-[#DDDDDD]">
                <div className="bg-green-50 p-2 rounded-lg w-fit mb-2">
                  <Award size={24} className="text-green-600" />
                </div>
                <p className="text-sm text-[#666666] mb-1">Pass Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {statistics.passRate}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${statistics.passRate}%` }}
                  />
                </div>
              </div>

              {/* Average score */}
              <div className="bg-white p-5 rounded-lg shadow-md border border-[#DDDDDD]">
                <div className="bg-orange-50 p-2 rounded-lg w-fit mb-2">
                  <TrendingUp size={24} className="text-orange-600" />
                </div>
                <p className="text-sm text-[#666666] mb-1">Average Score</p>
                <p
                  className={`text-3xl font-bold ${getScoreColor(
                    statistics.avgScore,
                  )}`}
                >
                  {statistics.avgScore}%
                </p>
              </div>
            </div>
          </div>

          {/* Data card */}
          <div className="mx-10 mb-12 max-w-6xl rounded-lg border border-[#DDDDDD] bg-white shadow-lg overflow-hidden">
            {/* Card header */}
            <div className="bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] px-6 py-4">
              <h2 className="text-lg font-bold text-white">
                Student Performance Data
              </h2>
              <p className="text-sm text-white/80">
                Showing {filteredAndSortedKeys.length} of{" "}
                {Object.keys(groupedResults).length} records
              </p>
            </div>

            {/* Filters */}
            <div className="p-6 bg-[#F9FCFF] border-b border-[#DDDDDD]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search student */}
                <div>
                  <label className="block text-xs font-semibold text-[#666666] mb-1">
                    <Search size={12} className="inline mr-1" />
                    Search Student
                  </label>
                  <input
                    type="text"
                    value={studentFilter}
                    onChange={(e) => setStuFilter(e.target.value)}
                    placeholder="e.g., Juan Dela Cruz"
                    className="w-full rounded-md border border-[#DDDDDD] px-3 py-2 text-sm focus:ring-2 focus:ring-[#3399FF] focus:outline-none"
                  />
                </div>

                {/* Quiz title */}
                <div>
                  <label className="block text-xs font-semibold text-[#666666] mb-1">
                    Quiz Title
                  </label>
                  <select
                    value={quizSearch}
                    onChange={(e) => setQuizSearch(e.target.value)}
                    className="w-full rounded-md border border-[#DDDDDD] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#3399FF] focus:outline-none"
                  >
                    <option value="">All Quizzes</option>
                    {Array.from(
                      new Set(
                        Object.values(groupedResults).map((r) => r.quiz),
                      ),
                    ).map((q) => (
                      <option key={q}>{q}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-[#666666] mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-md border border-[#DDDDDD] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#3399FF] focus:outline-none"
                  >
                    <option>All</option>
                    <option>Passed</option>
                    <option>Failed</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-semibold text-[#666666] mb-1">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full rounded-md border border-[#DDDDDD] bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#3399FF] focus:outline-none"
                  >
                    <option value="student">Student Name</option>
                    <option value="quiz">Quiz Title</option>
                    <option value="score">Latest Score</option>
                    <option value="attempts">Most Attempts</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table / states */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3399FF] mb-4" />
                  <p className="text-[#666666]">Loading progress data…</p>
                </div>
              ) : filteredAndSortedKeys.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3
                    size={48}
                    className="text-gray-300 mx-auto mb-4"
                  />
                  <p className="text-lg text-[#666666] mb-2">No records found</p>
                  <p className="text-sm text-[#999999]">
                    {Object.keys(groupedResults).length === 0
                      ? "No student submissions yet"
                      : "Try adjusting your filters"}
                  </p>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-[#F3F8FC] text-left border-b-2 border-[#DDDDDD]">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-[#3A3A3A]">
                        Student
                      </th>
                      <th className="px-6 py-3 font-semibold text-[#3A3A3A]">
                        Quiz Title
                      </th>
                      <th className="px-6 py-3 font-semibold text-[#3A3A3A]">
                        Difficulty
                      </th>
                      <th className="px-6 py-3 font-semibold text-[#3A3A3A]">
                        Attempts
                      </th>
                      <th className="px-6 py-3 font-semibold text-[#3A3A3A]">
                        Latest Score
                      </th>
                      <th className="px-6 py-3 font-semibold text-[#3A3A3A]">
                        Status
                      </th>
                      <th className="px-6 py-3 font-semibold text-[#3A3A3A]">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedKeys.map((key) => {
                      const entry = groupedResults[key];
                      const latestAttempt = entry.attempts[0];
                      const passed = latestAttempt.pass;

                      return (
                        <React.Fragment key={key}>
                          <tr className="border-b border-[#DDDDDD] hover:bg-[#F9FCFF] transition-colors">
                            <td className="px-6 py-4 font-medium text-[#3A3A3A]">
                              {entry.student}
                            </td>
                            <td className="px-6 py-4 text-[#666666]">
                              {entry.quiz}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(
                                  entry.quizDifficulty,
                                )}`}
                              >
                                {entry.quizDifficulty}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold">
                                {entry.attempts.length}
                              </span>
                              <span className="text-xs text-[#999999] ml-1">
                                {entry.attempts.length === 1
                                  ? "attempt"
                                  : "attempts"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-lg font-bold ${getScoreColor(
                                  latestAttempt.percent,
                                )}`}
                              >
                                {latestAttempt.percent}%
                              </span>
                              <span className="text-xs text-[#666666] ml-1">
                                ({latestAttempt.score})
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                                  passed
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {passed ? (
                                  <>
                                    <CheckCircle size={12} /> Passed
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={12} /> Failed
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleExpand(key)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#3399FF] text-[#3399FF] hover:bg-[#E8F6FF] text-xs font-medium transition"
                              >
                                {expandedRow[key] ? (
                                  <>
                                    <ChevronUp size={14} /> Hide
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown size={14} /> Show
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>

                          {expandedRow[key] && (
                            <tr className="border-b border-[#DDDDDD] bg-gradient-to-br from-[#F9FCFF] to-[#F3F8FC]">
                              <td colSpan={7} className="px-6 py-5">
                                <h4 className="text-sm font-semibold text-[#3A3A3A] mb-3">
                                  Attempt History
                                </h4>

                                <div className="space-y-3">
                                  {entry.attempts.map((a) => (
                                    <div
                                      key={a.id}
                                      className="p-4 bg-white rounded-lg border border-[#DDDDDD] hover:border-[#3399FF] transition-colors"
                                    >
                                      <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <span className="bg-[#3399FF] text-white px-3 py-1 rounded-md text-xs font-bold">
                                          Attempt #{a.attemptNumber}
                                        </span>
                                        <span className="font-medium text-[#3A3A3A]">
                                          Score: {a.score}
                                        </span>
                                        <span
                                          className={`text-lg font-bold ${getScoreColor(
                                            a.percent,
                                          )}`}
                                        >
                                          {a.percent}%
                                        </span>
                                        <span
                                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            a.pass
                                              ? "bg-green-50 text-green-700"
                                              : "bg-red-50 text-red-700"
                                          }`}
                                        >
                                          {a.pass ? "✓ Passed" : "✗ Failed"}
                                        </span>
                                        <span className="text-xs text-[#666666]">
                                          📅 {a.dateStr}
                                        </span>
                                      </div>

                                      {/* Question breakdown */}
                                      {Array.isArray(a.answers) &&
                                        a.answers.length > 0 && (
                                          <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                                            <p className="text-xs font-semibold text-[#666666] mb-2">
                                              Question Breakdown:
                                            </p>
                                            <div className="space-y-2">
                                              {a.answers.map(
                                                (ans, idx) => (
                                                  <div
                                                    key={idx}
                                                    className={`p-2 rounded text-xs border ${
                                                      ans.isCorrect
                                                        ? "bg-green-50 border-green-200"
                                                        : "bg-red-50 border-red-200"
                                                    }`}
                                                  >
                                                    <div className="flex items-start gap-2">
                                                      {ans.isCorrect ? (
                                                        <CheckCircle
                                                          size={14}
                                                          className="text-green-600 mt-0.5 flex-shrink-0"
                                                        />
                                                      ) : (
                                                        <XCircle
                                                          size={14}
                                                          className="text-red-600 mt-0.5 flex-shrink-0"
                                                        />
                                                      )}
                                                      <div className="flex-1">
                                                        <p className="font-medium text-[#3A3A3A] mb-1">
                                                          Q{idx + 1}:{" "}
                                                          {ans.question}
                                                        </p>
                                                        <p
                                                          className={
                                                            ans.isCorrect
                                                              ? "text-green-700"
                                                              : "text-red-700"
                                                          }
                                                        >
                                                          Student Answer:{" "}
                                                          <strong>
                                                            {
                                                              ans.studentAnswer
                                                            }
                                                          </strong>
                                                        </p>
                                                        {!ans.isCorrect && (
                                                          <p className="text-green-700 mt-0.5">
                                                            Correct Answer:{" "}
                                                            <strong>
                                                              {
                                                                ans.correctAnswer
                                                              }
                                                            </strong>
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
