/* --------------------------------------------------------------------------
   QuizPreviewPage.jsx – vivid-blue design (OVERVIEW MODE)
   --------------------------------------------------------------------------*/
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../firebase";

import StudentSidebar from "../../components/StudentSidebar";
import StudentTopNavBar from "../../components/StudentTopNavBar";

import {
  ArrowLeft,
  Clock,
  BookOpen,
  Target,
  ListChecks,
  FileText,
  Calendar,
} from "lucide-react";
import { toast } from "react-toastify";

/**
 * QuizPreviewPage – student-side overview (no answers shown).
 */
export default function QuizPreviewPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAssigned, setIsAssigned] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [assignmentData, setAssignmentData] = useState(null);

  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );

  /* ─────────────────────────────── Auth */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        toast.error("Please log in to view quizzes");
        navigate("/");
        return;
      }
      setCurrentUser(user);
    });
    return () => unsub();
  }, [auth, navigate]);

  /* ─────────────────────────────── Fetch quiz + assignment */
  useEffect(() => {
    if (!currentUser || !quizId) return;

    const fetchQuizData = async () => {
      setLoading(true);
      setError(null);
      try {
        const quizRef = doc(db, "quizzes", quizId);
        const quizSnap = await getDoc(quizRef);
        if (!quizSnap.exists()) {
          setError("Quiz not found");
          toast.error("Quiz not found");
          return;
        }
        const quizData = { id: quizSnap.id, ...quizSnap.data() };
        setQuiz(quizData);

        /* assignment? */
        const assignedRef = doc(
          db,
          "quizzes",
          quizId,
          "assignedTo",
          currentUser.uid,
        );
        const assignedSnap = await getDoc(assignedRef);
        if (assignedSnap.exists()) {
          setIsAssigned(true);
          setAssignmentData(assignedSnap.data());
        }

        /* submission? */
        const submissionsRef = collection(
          db,
          "quizzes",
          quizId,
          "submissions",
        );
        const submissionsSnap = await getDocs(submissionsRef);
        const userSubmission = submissionsSnap.docs.find(
          (d) => d.data().userId === currentUser.uid,
        );
        setHasSubmitted(!!userSubmission);
      } catch (err) {
        console.error("❌ Failed to fetch quiz:", err);
        setError("Failed to load quiz");
        toast.error("Failed to load quiz. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, currentUser]);

  /* ─────────────────────────────── Handlers */
  const handleBack = () => navigate(-1);

  const handleStartQuiz = () => {
    if (!isAssigned) {
      toast.warning("This quiz hasn't been assigned to you yet");
      return;
    }
    if (hasSubmitted) {
      toast.info("You have already submitted this quiz");
      return;
    }
    navigate(`/quiz/take/${quiz.id}`);
  };

  /* ─────────────────────────────── Helpers */
  const getDifficultyColor = (difficulty) => {
    const level = (difficulty || "").toLowerCase();
    switch (level) {
      case "easy":
        return "text-green-600 bg-green-50 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "hard":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getQuizTypeLabel = (quizType) => {
    if (!quizType) return "Unknown";
    const types = Array.isArray(quizType) ? quizType : [quizType];
    return types
      .map((t) => {
        const val = String(t).toLowerCase();
        if (val === "mc") return "Multiple Choice";
        if (val === "tf") return "True/False";
        return t;
      })
      .join(" & ");
  };

  const estimateTimeMinutes = (questions) => {
    if (!questions?.length) return 0;
    const mc = questions.filter((q) => q.question_type === "mc").length;
    const tf = questions.filter((q) => q.question_type === "tf").length;
    return Math.ceil(mc * 1 + tf * 0.5);
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return null;
    try {
      const d = timestamp.toDate();
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  /* ─────────────────────────────── Visual States */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF]">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#3399FF]" />
          <p className="text-lg text-[#333333]">Loading quiz preview…</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF]">
        <div className="max-w-md rounded-lg border border-[#DDDDDD] bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-5xl text-red-500">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-[#3A3A3A]">
            Quiz Not Found
          </h2>
          <p className="mb-6 text-[#666666]">
            {error ||
              "The quiz you're looking for doesn't exist or has been removed."}
          </p>
          <button
            onClick={handleBack}
            className="rounded-md bg-[#3399FF] px-6 py-2 font-medium text-white transition hover:bg-[#2785E3]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /* derived data */
  const questions = quiz.questions || [];
  const mcQuestions = questions.filter((q) => q.question_type === "mc");
  const tfQuestions = questions.filter((q) => q.question_type === "tf");
  const totalQuestions = questions.length;
  const estimatedTime = estimateTimeMinutes(questions);

  /* ─────────────────────────────── UI */
  return (
    <>
      {/* Global student navbar */}
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={() => navigate("/profile")}
        onLogoutClick={async () => {
          await auth.signOut();
          toast.success("Logged out successfully!");
          navigate("/");
        }}
      />

      <div
        className={`flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]`}
      >
        {/* Sidebar */}
        <StudentSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={(val) => {
            localStorage.setItem("sidebarMinimized", val);
            setSidebarMinimized(val);
          }}
        />

        {/* Main content */}
        <main
          className={`flex-1 overflow-y-auto px-8 pt-8 transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          {/* Back / Title row */}
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-lg font-semibold leading-none tracking-tight">
              Quiz Overview
            </h1>
          </div>

          {/* Quiz card */}
          <div className="mb-8 max-w-4xl rounded-lg border border-[#DDDDDD] bg-white p-8 shadow-lg">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="mb-3 text-3xl font-bold text-[#3399FF]">
                  {quiz.title || "Untitled Quiz"}
                </h2>
                {quiz.description && (
                  <p className="text-base leading-relaxed text-[#666666]">
                    {quiz.description}
                  </p>
                )}
              </div>

              {/* status */}
              <div className="flex flex-col gap-2">
                {!isAssigned && (
                  <span className="whitespace-nowrap rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                    Not Assigned
                  </span>
                )}
                {hasSubmitted && (
                  <span className="whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    ✓ Submitted
                  </span>
                )}
              </div>
            </div>

            {/* stats grid */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* total Qs */}
              <StatCard
                icon={<ListChecks size={24} className="text-[#3399FF]" />}
                label="Total Questions"
                value={totalQuestions}
                sub={`${mcQuestions.length} Multiple Choice${
                  mcQuestions.length && tfQuestions.length ? " • " : ""
                }${tfQuestions.length ? `${tfQuestions.length} True/False` : ""}`}
              />
              {/* difficulty */}
              <StatCard
                icon={<Target size={24} className="text-[#3399FF]" />}
                label="Difficulty Level"
                value={
                  <span
                    className={`inline-block rounded-lg border px-3 py-1 text-xl font-bold ${getDifficultyColor(
                      quiz.difficulty,
                    )}`}
                  >
                    {quiz.difficulty || "N/A"}
                  </span>
                }
              />
              {/* type */}
              <StatCard
                icon={<BookOpen size={24} className="text-[#3399FF]" />}
                label="Quiz Type"
                value={getQuizTypeLabel(quiz.quizType)}
              />
              {/* time */}
              <StatCard
                icon={<Clock size={24} className="text-[#3399FF]" />}
                label="Estimated Time"
                value={`~${estimatedTime}`}
                sub="minutes"
              />
              {/* assigned date */}
              {assignmentData?.assignedAt && (
                <StatCard
                  icon={<Calendar size={24} className="text-[#3399FF]" />}
                  label="Assigned Date"
                  value={formatDate(assignmentData.assignedAt)}
                />
              )}
              {/* subject */}
              {quiz.subject && (
                <StatCard
                  icon={<FileText size={24} className="text-[#3399FF]" />}
                  label="Subject"
                  value={quiz.subject}
                />
              )}
            </div>

            {/* info box */}
            <div className="mb-6 rounded-md border-l-4 border-[#3399FF] bg-blue-50 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#3399FF]">
                ℹ️ Important Information
              </h3>
              <ul className="space-y-1 text-sm text-[#333333]">
                <li>
                  • Make sure you have a stable internet connection before
                  starting
                </li>
                <li>
                  • You'll need approximately{" "}
                  <strong>{estimatedTime} minutes</strong> to complete this quiz
                </li>
                <li>• Read each question carefully before answering</li>
                {hasSubmitted && (
                  <li className="font-medium text-green-600">
                    • You have already submitted this quiz
                  </li>
                )}
                {!isAssigned && (
                  <li className="font-medium text-yellow-600">
                    • This quiz is not yet assigned to you
                  </li>
                )}
              </ul>
            </div>

            {/* start btn */}
            <div className="flex items-center justify-between border-t border-[#DDDDDD] pt-4">
              <span className="text-sm text-[#666666]">
                {hasSubmitted ? (
                  <span className="font-medium text-green-600">
                    ✓ You've already submitted this quiz
                  </span>
                ) : !isAssigned ? (
                  <span className="font-medium text-yellow-600">
                    ⚠️ This quiz hasn't been assigned to you yet
                  </span>
                ) : totalQuestions === 0 ? (
                  <span className="font-medium text-red-600">
                    ⚠️ This quiz has no questions
                  </span>
                ) : (
                  <span className="font-medium text-[#3399FF]">
                    ✅ You're ready to start!
                  </span>
                )}
              </span>
              <button
                onClick={handleStartQuiz}
                disabled={!isAssigned || hasSubmitted || !totalQuestions}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] px-8 py-3 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:from-[#2A8AEE] hover:to-[#4BA0EE] disabled:cursor-not-allowed disabled:opacity-50"
              >
                🚀 Start Quiz
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

/* ────────────────────────────────
   Small stat card component
──────────────────────────────── */
function StatCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-[#DDDDDD] bg-gradient-to-br from-[#F3F8FC] to-[#E8F6FF] p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-md bg-white p-2 shadow-sm">{icon}</div>
        <h3 className="text-sm font-semibold text-[#666666]">{label}</h3>
      </div>
      <p className="text-3xl font-bold text-[#3A3A3A]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#666666]">{sub}</p>}
    </div>
  );
}
