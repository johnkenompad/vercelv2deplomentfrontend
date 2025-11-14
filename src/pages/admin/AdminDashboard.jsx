// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import AdminSidebar from "../../components/AdminSidebar";
import {
  Users,
  FileText,
  ShieldCheck,
  UserCheck,
  Loader2,
} from "lucide-react";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  collectionGroup,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

const AdminDashboard = () => {
  /* ───────── Sidebar state ───────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );

  /* ───────── Data state ───────── */
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    lecturers: 0,
    students: 0,
    questions: 0,
    users: 0,
  });
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [error, setError] = useState(null);

  /* ───────── Services ───────── */
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();

  /* ───────── Auth guard ───────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/login");
    });
    return unsub;
  }, [auth, navigate]);

  /* ───────── Fetch dashboard data ───────── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        /* ---------- Users snapshot ---------- */
        const usersSnap = await getDocs(collection(db, "users"));

        /* ---------- Latest quizzes (5) ---------- */
        const quizzesSnap = await getDocs(
          query(collection(db, "quizzes"), orderBy("createdAt", "desc"), limit(5)),
        );

        /* ---------- Question counts ---------- */
        const allQuizzesSnap = await getDocs(collection(db, "quizzes"));
        const subQuestionsSnap = await getDocs(collectionGroup(db, "questions"));

        /* ---------- Derived counts ---------- */
        const lecturersCount = usersSnap.docs.filter((d) => {
          const role = d.data().role?.toLowerCase?.();
          return role === "teacher" || role === "lecturer";
        }).length;

        const studentsCount = usersSnap.docs.filter(
          (d) => d.data().role?.toLowerCase?.() === "student",
        ).length;

        let inlineQuestions = 0;
        allQuizzesSnap.docs.forEach((quizDoc) => {
          const qData = quizDoc.data();
          inlineQuestions +=
            Array.isArray(qData.questionIds)
              ? qData.questionIds.length
              : Array.isArray(qData.questions)
              ? qData.questions.length
              : 0;
        });

        const totalQuestions = inlineQuestions + subQuestionsSnap.size;

        setStatsData({
          lecturers: lecturersCount,
          students : studentsCount,
          questions: totalQuestions,
          users    : usersSnap.size,
        });

        /* ---------- Map recent quizzes ---------- */
        const quizzesData = quizzesSnap.docs.map((quizDoc) => {
          const data = quizDoc.data();
          const createdAt = data.createdAt?.toDate?.();
          return {
            id: quizDoc.id,
            title: data.title || "Untitled Quiz",
            questionsCount:
              (Array.isArray(data.questionIds) && data.questionIds.length) ||
              (Array.isArray(data.questions) && data.questions.length) ||
              0,
            status: data.status || "Draft",
            created: createdAt
              ? createdAt.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Unknown",
          };
        });

        setRecentQuizzes(quizzesData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db]);

  /* ───────── Badge config ───────── */
  const StatusBadge = ({ status }) => {
    const styles = {
      Active: "bg-green-100 text-green-700 border-green-200",
      Draft: "bg-blue-100 text-blue-700 border-blue-200",
      Archived: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          styles[status] || styles.Draft
        }`}
      >
        {status}
      </span>
    );
  };

  /* ───────── Handlers ───────── */
  const handleProfile = () => navigate("/profile");
  const handleLogout  = () => signOut(auth).then(() => navigate("/"));
  const handleQuizClick = (id) => navigate(`/admin/questions?quiz=${id}`);

  /* ───────── Loading fallback ───────── */
  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
        <AdminSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
        />
        <div
          className={`flex flex-1 items-center justify-center ${
            sidebarMinimized ? "ml-[72px]" : "ml-[240px]"
          }`}
        >
          <div className="text-center">
            <Loader2
              size={48}
              className="mx-auto mb-4 animate-spin text-[#3399FF]"
            />
            <p className="text-lg text-[#333333]/70">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  /* ───────── Stats cards ───────── */
  const stats = [
    {
      label: "Lecturer",
      count: statsData.lecturers,
      bg: "bg-[#D3EAFE]",
      text: "text-[#1D4F91]",
      icon: <UserCheck size={28} />,
      route: "/admin/user-management",
    },
    {
      label: "Student",
      count: statsData.students,
      bg: "bg-[#FECACA]",
      text: "text-[#991B1B]",
      icon: <Users size={28} />,
      route: "/admin/user-management",
    },
    {
      label: "Questions",
      count: statsData.questions,
      bg: "bg-[#CFFAFE]",
      text: "text-[#0E7490]",
      icon: <FileText size={28} />,
      route: "/admin/questions",
    },
    {
      label: "System Users",
      count: statsData.users,
      bg: "bg-[#DCFCE7]",
      text: "text-[#166534]",
      icon: <ShieldCheck size={28} />,
      route: "/admin/user-management",
    },
  ];

  /* ───────── Render ───────── */
  return (
    <AdminLayout
      sidebarMinimized={sidebarMinimized}
      setSidebarMinimized={setSidebarMinimized}
      onProfileClick={handleProfile}
      onLogoutClick={handleLogout}
    >
      {/* Page header */}
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
        <p className="text-[#666666]">
          A quick summary of system activity and quiz metrics.
        </p>
      </div>

      {/* Stats */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {stats.map((item) => (
          <article
            key={item.label}
            onClick={() => navigate(item.route)}
            className={`${item.bg} ${item.text} cursor-pointer rounded-lg border border-gray-200 p-5 shadow-sm transition hover:scale-[1.03] hover:shadow-md`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-3xl font-bold">{item.count}</span>
              <span className="opacity-80">{item.icon}</span>
            </div>
            <p className="text-lg font-semibold">{item.label}</p>
            <p className="mt-3 text-center text-sm opacity-70 group-hover:underline">
              More info →
            </p>
          </article>
        ))}
      </section>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Recent Quizzes */}
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-800">
            Recently Created Quizzes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[
                  "Quiz Title",
                  "Questions",
                  "Status",
                  "Created At",
                ].map((th) => (
                  <th
                    key={th}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
                  >
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentQuizzes.map((quiz) => (
                <tr
                  key={quiz.id}
                  onClick={() => handleQuizClick(quiz.id)}
                  className="cursor-pointer transition hover:bg-gray-50"
                >
                  <td className="max-w-[220px] truncate px-6 py-4 text-sm font-medium text-gray-800">
                    {quiz.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {quiz.questionsCount}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <StatusBadge status={quiz.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {quiz.created}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-10 text-center text-xs text-gray-500">
        © 2025 – QuizRush Admin Panel. All rights reserved.
      </footer>
    </AdminLayout>
  );
};

export default AdminDashboard;
