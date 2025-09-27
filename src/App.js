import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './components/Notification';

// Shared Pages
import Landing from './pages/shared/Landing';
import Register from './pages/auth/Register';
import Login from './pages/auth/Login';
import RoleSelection from './pages/auth/RoleSelection';
import DashboardRouter from './pages/shared/DashboardRouter';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import AssignedQuizzesPage from './pages/student/AssignedQuizzesPage';
import TakeQuiz from './pages/student/TakeQuiz';
import QuizPreviewPage from './pages/student/QuizPreviewPage';
import ResultsPage from './pages/student/ResultsPage';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import GenerateQuiz from './pages/teacher/GenerateQuiz';
import CustomizeQuiz from './pages/teacher/CustomizeQuiz';
import AssignQuizzesPage from './pages/teacher/AssignQuizzesPage';
import QuizPreview from './pages/teacher/QuizPreview';
import StudentProgress from './pages/teacher/StudentProgress';
import ReportsPage from './pages/teacher/ReportsPage';
import TeacherCrossword from './pages/teacher/games/Crossword';
import TeacherWordSearch from './pages/teacher/games/WordSearch';
import TeacherGameHub from './pages/teacher/games/GameHub';
import GenerateWordSearch from './pages/teacher/games/GenerateWordSearch'; // ✅ NEW
import SavedWordSearchList from './pages/teacher/games/SavedWordSearchList'; // ✅ NEW

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AdminSettings from './pages/admin/AdminSettings';
import DataManagement from './pages/admin/DataManagement';
import EntityLinksPage from './pages/admin/EntityLinksPage';
import QuestionBank from './pages/admin/QuestionBank';

const RoleProtectedRoute = ({ children, allowedRole }) => {
  const role = localStorage.getItem('userRole');
  return role === allowedRole ? children : (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c' }}>
      <h2>🚫 Access Denied</h2>
      <p>You must be logged in as a <strong>{allowedRole}</strong> to view this page.</p>
      <a href="/login" style={{ color: '#15803d', fontWeight: 'bold' }}>Go to Login</a>
    </div>
  );
};

const ROUTES = [
  // 🌐 Public
  { path: '/', element: <Landing /> },
  { path: '/register', element: <Register /> },
  { path: '/login', element: <Login /> },
  { path: '/select-role', element: <RoleSelection /> },
  { path: '/dashboard', element: <DashboardRouter /> },

  // 🎓 Student
  { path: '/student-dashboard', role: 'student', element: <StudentDashboard /> },
  { path: '/assigned-quizzes', role: 'student', element: <AssignedQuizzesPage /> },
  { path: '/quiz/details/:quizId', role: 'student', element: <QuizPreviewPage /> },
  { path: '/quiz/take/:quizId', role: 'student', element: <TakeQuiz /> },
  { path: '/take-quiz', role: 'student', element: <TakeQuiz /> },
  { path: '/view-results', role: 'student', element: <ResultsPage /> },

  // 👨‍🏫 Teacher
  { path: '/teacher-dashboard', role: 'teacher', element: <TeacherDashboard /> },
  { path: '/generate-quiz', role: 'teacher', element: <GenerateQuiz /> },
  { path: '/customize-quiz', role: 'teacher', element: <CustomizeQuiz /> },
  { path: '/assign-quizzes', role: 'teacher', element: <AssignQuizzesPage /> },
  { path: '/quiz/:id', role: 'teacher', element: <QuizPreview /> },
  { path: '/progress', role: 'teacher', element: <StudentProgress /> },
  { path: '/reports', role: 'teacher', element: <ReportsPage /> },

  // 🎮 Games (Teacher)
  { path: '/teacher/games', role: 'teacher', element: <TeacherGameHub /> },
  { path: '/teacher/games/crossword', role: 'teacher', element: <TeacherCrossword /> },
  { path: '/teacher/games/word-search', role: 'teacher', element: <TeacherWordSearch /> },
  { path: '/teacher/games/generate-wordsearch', role: 'teacher', element: <GenerateWordSearch /> }, // ✅ NEW
  { path: '/teacher/games/saved-wordsearch', role: 'teacher', element: <SavedWordSearchList /> },   // ✅ NEW

  // 🛡️ Admin
  { path: '/admin-dashboard', role: 'admin', element: <AdminDashboard /> },
  { path: '/admin-dashboard/user-management', role: 'admin', element: <UserManagement /> },
  { path: '/admin-dashboard/settings', role: 'admin', element: <AdminSettings /> },
  { path: '/admin-dashboard/data-management', role: 'admin', element: <DataManagement /> },
  { path: '/admin-dashboard/entity-links', role: 'admin', element: <EntityLinksPage /> },
  { path: '/admin-dashboard/question-bank', role: 'admin', element: <QuestionBank /> }
];

function App() {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
          {ROUTES.map(({ path, element, role }, i) => (
            <Route
              key={i}
              path={path}
              element={role ? (
                <RoleProtectedRoute allowedRole={role}>{element}</RoleProtectedRoute>
              ) : element}
            />
          ))}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default App;
