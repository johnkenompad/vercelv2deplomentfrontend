/* --------------------------------------------------------------------------  
   App.jsx – central router (FIXED)
---------------------------------------------------------------------------*/
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { NotificationProvider } from "./components/Notification";

/* ───────── Shared Pages ───────── */
import Landing from "./pages/shared/Landing";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import RoleSelection from "./pages/auth/RoleSelection";
import DashboardRouter from "./pages/shared/DashboardRouter";

/* ───────── Student Pages ───────── */
import StudentDashboard from "./pages/student/StudentDashboard";
import AssignedQuizzesPage from "./pages/student/AssignedQuizzesPage";
import TakeQuiz from "./pages/student/TakeQuiz";
import QuizPreviewPage from "./pages/student/QuizPreviewPage";
import ResultsPage from "./pages/student/ResultsPage";
import PracticeQuiz from "./pages/student/PracticeQuiz";
import DailyTrivia from "./pages/student/DailyTrivia";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import StudentAchievements from "./pages/student/StudentAchievements";
import WordSearchQuiz from "./pages/student/games/WordSearchQuiz";

/* ───────── Teacher Pages ───────── */
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import GenerateQuiz from "./pages/teacher/GenerateQuiz";
import CustomizeQuiz from "./pages/teacher/CustomizeQuiz";
import AssignQuizzesPage from "./pages/teacher/AssignQuizzesPage";
import QuizPreview from "./pages/teacher/QuizPreview";
import StudentProgress from "./pages/teacher/StudentProgress";
import ReportsPage from "./pages/teacher/ReportsPage";
import TeacherCrossword from "./pages/teacher/games/Crossword";
import TeacherWordSearch from "./pages/teacher/games/WordSearch";
import TeacherGameHub from "./pages/teacher/games/GameHub";
import GenerateWordSearch from "./pages/teacher/games/GenerateWordSearch";
import SavedWordSearchList from "./pages/teacher/games/SavedWordSearchList";
import WordSearchInput from "./pages/teacher/games/WordSearchInput";
import MyQuizzes from "./pages/teacher/MyQuizzes";
import TeacherProfilePage from "./pages/teacher/TeacherProfilePage";
import ManageClass from "./pages/teacher/ManageClass";

/* ───────── Admin Pages ───────── */
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import DataManagement from "./pages/admin/DataManagement";
import EntityLinksPage from "./pages/admin/EntityLinksPage";
import QuestionBank from "./pages/admin/QuestionBank";
import AdminReports from "./pages/admin/AdminReports";
import AdminActivityLog from "./pages/admin/AdminActivityLog";

/* ───────── Role Guard ───────── */
const RoleProtectedRoute = ({ children, allowedRole }) => {
  const role = localStorage.getItem("userRole");
  return role === allowedRole ? (
    children
  ) : (
    <div style={{ padding: "2rem", textAlign: "center", color: "#b91c1c" }}>
      <h2>🚫 Access Denied</h2>
      <p>
        You must be logged in as a <strong>{allowedRole}</strong> to view this page.
      </p>
      <a href="/login" style={{ color: "#15803d", fontWeight: "bold" }}>
        Go to Login
      </a>
    </div>
  );
};

/* ───────── Central Route Config ───────── */
const ROUTES = [
  /* 🌐 Public */
  { path: "/", element: <Landing /> },
  { path: "/register", element: <Register /> },
  { path: "/login", element: <Login /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/select-role", element: <RoleSelection /> },
  { path: "/dashboard", element: <DashboardRouter /> },

  /* 🎓 Student */
  { path: "/student-dashboard", role: "student", element: <StudentDashboard /> },
  { path: "/assigned-quizzes", role: "student", element: <AssignedQuizzesPage /> },
  { path: "/quiz/details/:quizId", role: "student", element: <QuizPreviewPage /> },
  { path: "/quiz/take/:quizId", role: "student", element: <TakeQuiz /> },
  { path: "/take-quiz", role: "student", element: <TakeQuiz /> },
  { path: "/view-results", role: "student", element: <ResultsPage /> },
  { path: "/practice-quiz", role: "student", element: <PracticeQuiz /> },
  { path: "/word-search-quiz", role: "student", element: <WordSearchQuiz /> },
  { path: "/student/daily-trivia", role: "student", element: <DailyTrivia /> },
  { path: "/student/profile", role: "student", element: <StudentProfilePage /> },
  { path: "/student/achievements", role: "student", element: <StudentAchievements /> },

  /* 👨‍🏫 Teacher */
  { path: "/teacher-dashboard", role: "teacher", element: <TeacherDashboard /> },
  { path: "/generate-quiz", role: "teacher", element: <GenerateQuiz /> },
  { path: "/customize-quiz", role: "teacher", element: <CustomizeQuiz /> },
  { path: "/assign-quizzes", role: "teacher", element: <AssignQuizzesPage /> },
  { path: "/quiz/:id", role: "teacher", element: <QuizPreview /> },
  { path: "/progress", role: "teacher", element: <StudentProgress /> },
  { path: "/reports", role: "teacher", element: <ReportsPage /> },
  { path: "/teacher/my-quizzes", role: "teacher", element: <MyQuizzes /> },
  { path: "/teacher/profile", role: "teacher", element: <TeacherProfilePage /> },
  { path: "/teacher/manage-class", role: "teacher", element: <ManageClass /> },

  /* 🎮 Games (Teacher) */
  { path: "/teacher/games", role: "teacher", element: <TeacherGameHub /> },
  { path: "/teacher/games/crossword", role: "teacher", element: <TeacherCrossword /> },
  { path: "/teacher/games/word-search", role: "teacher", element: <TeacherWordSearch /> },
  { path: "/teacher/word-search", role: "teacher", element: <TeacherWordSearch /> },
  { path: "/teacher/games/generate-wordsearch", role: "teacher", element: <GenerateWordSearch /> },
  { path: "/teacher/games/saved-wordsearch", role: "teacher", element: <SavedWordSearchList /> },
  { path: "/teacher/word-search/input", role: "teacher", element: <WordSearchInput /> },

  /* 🛡️ Admin */
  { path: "/admin-dashboard", role: "admin", element: <AdminDashboard /> },
  { path: "/admin-dashboard/user-management", role: "admin", element: <UserManagement /> },
  { path: "/admin-dashboard/settings", role: "admin", element: <AdminSettings /> },
  { path: "/admin-dashboard/data-management", role: "admin", element: <DataManagement /> },
  { path: "/admin-dashboard/entity-links", role: "admin", element: <EntityLinksPage /> },
  { path: "/admin-dashboard/question-bank", role: "admin", element: <QuestionBank /> },
  { path: "/admin/question-bank", role: "admin", element: <QuestionBank /> },
  { path: "/admin-dashboard/reports", role: "admin", element: <AdminReports /> },
  { path: "/admin-dashboard/activity-log", role: "admin", element: <AdminActivityLog /> },
];

/* ───────── App ───────── */
function App() {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
          {ROUTES.map(({ path, element, role }, i) => (
            <Route
              key={i}
              path={path}
              element={
                role ? (
                  <RoleProtectedRoute allowedRole={role}>
                    {element}
                  </RoleProtectedRoute>
                ) : (
                  element
                )
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </Router>
    </NotificationProvider>
  );
}

export default App;