/* --------------------------------------------------------------------------
   TakeQuiz.jsx – vivid-blue student quiz-taking experience (with StudentTopNavBar)
   ⬆️  UPDATED: Now writes quiz completion stats to /leaderboard/{uid}
---------------------------------------------------------------------------*/
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getDocs,
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  addDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate, useLocation } from "react-router-dom";

/* Shared layout */
import StudentSidebar from "../../components/StudentSidebar";
import StudentTopNavBar from "../../components/StudentTopNavBar";

/* Icons */
import {
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  RotateCcw,
  Eye,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-toastify";

/**
 * TakeQuiz.jsx – vivid-blue design system (ENHANCED)
 * Features:
 * • Modern card design and responsive layout
 * • Progress bar, timer, improved navigation
 * • Robust error handling and state management
 * • Leaderboard statistics tracking
 */
export default function TakeQuiz() {
  /* ────────────────────── State */
  const [assignedQuizzes,  setAssignedQuizzes]  = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [activeQuizId,     setActiveQuizId]     = useState(null);
  const [reviewingQuizId,  setReviewingQuizId]  = useState(null);
  const [answers,          setAnswers]          = useState({});
  const [qIndex,           setQIndex]           = useState({});
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [studentName,      setStudentName]      = useState("");
  const [currentUser,      setCurrentUser]      = useState(null);
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [sortOrder,        setSortOrder]        = useState("due-soon");
  const [startTime,        setStartTime]        = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const auth     = getAuth();

  /* ────────────────────── Auth listener */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      setCurrentUser(user);

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fullName = [userData.firstName, userData.middleName, userData.lastName]
            .filter(Boolean)
            .join(" ");
          setStudentName(
            fullName ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "Student",
          );
        } else {
          setStudentName(
            user.displayName || user.email?.split("@")[0] || "Student",
          );
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setStudentName(
          user.displayName || user.email?.split("@")[0] || "Student",
        );
      }
    });
    return () => unsub();
  }, [auth, navigate]);

  /* ────────────────────── Fetch assigned quizzes */
  const fetchAssignedQuizzes = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);

    try {
      const quizzesSnap = await getDocs(collection(db, "quizzes"));
      const assigned = [];

      for (const q of quizzesSnap.docs) {
        const assignedRef = doc(
          db,
          "quizzes",
          q.id,
          "assignedTo",
          currentUser.uid,
        );
        const assignedSnap = await getDoc(assignedRef);
        if (!assignedSnap.exists()) continue;

        let quizData = q.data();

        /* Hydrate manual quiz questions from questionBank */
        if (!quizData.questions?.length && Array.isArray(quizData.questionIds)) {
          const fetched = await Promise.all(
            quizData.questionIds.map((qid) =>
              getDoc(doc(db, "questionBank", qid)),
            ),
          );
          const questions = fetched
            .filter((d) => d.exists())
            .map((d) => d.data())
            .map((x) => ({
              question_type:
                x.questionType === "mcq"
                  ? "multiple_choice"
                  : x.questionType === "truefalse"
                  ? "true_false"
                  : x.questionType,
              question: x.questionText,
              options: x.choices,
              answer: x.correctAnswer,
            }));
          quizData = { ...quizData, questions };
        }

        /* Normalize question_type */
        const normalizedQs = (quizData.questions || []).map((x) => {
          const normalized = {
            ...x,
            question_type:
              x.question_type === "mc"
                ? "multiple_choice"
                : x.question_type === "tf"
                ? "true_false"
                : x.question_type,
            options: x.options || x.choices,
          };
          
          // Fix: Convert answer index to actual answer text for multiple choice
          if (normalized.question_type === "multiple_choice") {
            const answerField = x.answer ?? x.correct_answer ?? x.correctAnswer;
            const options = normalized.options || [];
            
            // If answer is a number (index), convert it to the actual option text
            if (typeof answerField === "number" && options[answerField]) {
              normalized.answer = options[answerField];
            } else if (answerField !== undefined) {
              // Keep as is if it's already text
              normalized.answer = answerField;
            }
          } else if (normalized.question_type === "true_false") {
            // For true/false, ensure answer is properly formatted as "True" or "False"
            const answerField = x.answer ?? x.correct_answer ?? x.correctAnswer;
            
            if (typeof answerField === "boolean") {
              normalized.answer = answerField ? "True" : "False";
            } else if (typeof answerField === "number") {
              normalized.answer = answerField === 1 ? "True" : "False";
            } else if (answerField !== undefined) {
              // Normalize string values to "True" or "False"
              const strAnswer = String(answerField).toLowerCase();
              normalized.answer = strAnswer === "true" || strAnswer === "1" ? "True" : "False";
            }
          } else {
            // For other question types
            normalized.answer = x.answer ?? x.correct_answer ?? x.correctAnswer;
          }
          
          return normalized;
        });

        const resultRef = doc(db, "users", currentUser.uid, "results", q.id);
        const resultSnap = await getDoc(resultRef);
        const resultData = resultSnap.exists() ? resultSnap.data() : {};

        const asgData = assignedSnap.data();
        const dueDate =
          asgData.deadline ??
          asgData.assignedAt?.toDate()?.toISOString().split("T")[0] ??
          null;

        const pct = resultSnap.exists()
          ? Math.round(
              (resultData.score /
                (resultData.total || normalizedQs.length || 1)) *
                100,
            )
          : 0;

        assigned.push({
          id: q.id,
          ...quizData,
          questions: normalizedQs,
          assignedAt: asgData.assignedAt,
          submitted: resultSnap.exists(),
          score: resultData.score || 0,
          attempts: resultData.attempts || 0,
          percentage: pct,
          due: dueDate ? new Date(dueDate).toLocaleDateString() : "—",
          dueTimestamp: dueDate ? new Date(dueDate).getTime() : null,
        });
      }

      setAssignedQuizzes(assigned);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      toast.error("Failed to load quizzes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchAssignedQuizzes();
    }
  }, [currentUser, fetchAssignedQuizzes]);

  /* ────────────────────── Handle review mode from navigation state */
  useEffect(() => {
    const handleNavigationReview = async () => {
      if (!location.state?.reviewQuizId || assignedQuizzes.length === 0 || !currentUser) {
        return;
      }
      
      const quizId = location.state.reviewQuizId;
      const attemptId = location.state.reviewAttemptId;
      const quiz = assignedQuizzes.find(q => q.id === quizId);
      
      if (!quiz) {
        toast.error("Quiz not found");
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }

      if (quiz.visibleToStudents === false) {
        toast.info("📢 Your teacher has hidden the results for this quiz.");
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }
      
      try {
        let attemptData = null;
        
        // If a specific attempt ID was provided, try to load that attempt
        if (attemptId) {
          try {
            const attemptDoc = await getDoc(
              doc(db, `users/${currentUser.uid}/results/${quiz.id}/attempts`, attemptId)
            );
            if (attemptDoc.exists()) {
              attemptData = attemptDoc.data();
            }
          } catch (err) {
            console.error("Error loading specific attempt:", err);
          }
        }
        
        // If no specific attempt or it wasn't found, get the latest attempt
        if (!attemptData) {
          const attQ = query(
            collection(
              db,
              `users/${currentUser.uid}/results/${quiz.id}/attempts`,
            ),
            orderBy("submittedAt", "desc"),
            limit(1),
          );
          const attSnap = await getDocs(attQ);
          
          if (attSnap.empty) {
            toast.error("No attempts found for this quiz.");
            navigate(location.pathname, { replace: true, state: {} });
            return;
          }
          
          attemptData = attSnap.docs[0].data();
        }
        
        const vis = attemptData.visibleToStudent !== false;
        
        if (!vis) {
          toast.info("📢 Your teacher has hidden the result for this attempt.");
          navigate(location.pathname, { replace: true, state: {} });
          return;
        }
        
        // Load the marked questions with correct/incorrect flags
        const attemptAnswers = attemptData.answers || [];
        
        if (attemptAnswers.length === 0) {
          toast.warning("Answer details not available for this attempt.");
          navigate(location.pathname, { replace: true, state: {} });
          return;
        }
        
        // Map the answers back to the questions
        const markedQuestions = quiz.questions.map((q) => {
          const answerDetail = attemptAnswers.find(a => a.question === q.question);
          if (answerDetail) {
            return {
              ...q,
              userAnswer: answerDetail.studentAnswer,
              correctAnswer: answerDetail.correctAnswer,
              isCorrect: answerDetail.isCorrect,
            };
          }
          return {
            ...q,
            userAnswer: null,
            isCorrect: false,
          };
        });
        
        // Update the quiz in state with marked questions
        setAssignedQuizzes((prev) =>
          prev.map((q) =>
            q.id === quiz.id
              ? { ...q, questions: markedQuestions }
              : q
          )
        );
        
        setReviewingQuizId(quiz.id);
        setQIndex((prev) => ({ ...prev, [quiz.id]: 0 }));
        
        // Clear the navigation state to prevent re-triggering
        navigate(location.pathname, { replace: true, state: {} });
      } catch (err) {
        console.error("Review error:", err);
        console.error("Error details:", {
          code: err?.code,
          message: err?.message,
          stack: err?.stack
        });
        toast.error(`Failed to load review: ${err.message || "Unknown error"}`);
        navigate(location.pathname, { replace: true, state: {} });
      }
    };

    handleNavigationReview();
  }, [location.state, assignedQuizzes, currentUser, navigate, location.pathname]);

  /* ────────────────────── Filtered & Sorted Quizzes */
  const filteredQuizzes = useMemo(() => {
    let filtered = assignedQuizzes.filter(
      (q) =>
        difficultyFilter === "All" ||
        (q.difficulty || "N/A") === difficultyFilter,
    );

    filtered.sort((a, b) => {
      if (sortOrder === "due-soon") {
        const aTime = a.dueTimestamp || Infinity;
        const bTime = b.dueTimestamp || Infinity;
        return aTime - bTime;
      } else if (sortOrder === "newest") {
        const aTime = a.assignedAt?.toMillis?.() || 0;
        const bTime = b.assignedAt?.toMillis?.() || 0;
        return bTime - aTime;
      }
      return 0;
    });

    return filtered;
  }, [assignedQuizzes, difficultyFilter, sortOrder]);

  /* ────────────────────── Leaderboard updater */
  const updateLeaderboardStats = useCallback(
    async ({ isPerfect }) => {
      try {
        const lbRef = doc(db, "leaderboard", currentUser.uid);
        const lbSnap = await getDoc(lbRef);
        const prev = lbSnap.exists() ? lbSnap.data() : {};

        /* streak logic */
        const todayStr = new Date().toISOString().split("T")[0];
        let newStreak = 1;
        if (prev.lastCompleted) {
          const last = prev.lastCompleted.toDate
            ? prev.lastCompleted.toDate()
            : new Date(prev.lastCompleted);
          const diff = Math.floor(
            (new Date(todayStr) - new Date(last.toISOString().split("T")[0])) /
              (1000 * 60 * 60 * 24),
          );
          newStreak = diff === 1 ? (prev.currentStreak || 0) + 1 : diff === 0 ? prev.currentStreak || 1 : 1;
        }

        await setDoc(
          lbRef,
          {
            uid: currentUser.uid,
            username: studentName,
            quizzesCompleted: (prev.quizzesCompleted || 0) + 1,
            perfectScores: isPerfect ? (prev.perfectScores || 0) + 1 : prev.perfectScores || 0,
            currentStreak: newStreak,
            lastCompleted: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (err) {
        console.error("Leaderboard update error:", err);
      }
    },
    [currentUser, studentName],
  );

  /* ────────────────────── Handlers */
  const handleChange = useCallback((quizId, question, value) => {
    setAnswers((prev) => ({
      ...prev,
      [quizId]: { ...(prev[quizId] || {}), [question]: value },
    }));
  }, []);

  const handleSubmit = async (quiz) => {
    const selected = answers[quiz.id] || {};
    
    // Validate all questions are answered
    if (Object.keys(selected).length !== quiz.questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }
    
    let correct = 0;
    const answerDetails = [];

    const markedQuestions = quiz.questions.map((q) => {
      let ua = (selected[q.question] || "").trim();
      let correctAnswer = q.answer ?? q.correct_answer ?? q.correctAnswer ?? "";
      
      // Handle case where correctAnswer might still be an index
      if (typeof correctAnswer === "number" && q.options && q.options[correctAnswer]) {
        correctAnswer = q.options[correctAnswer];
      }
      
      correctAnswer = String(correctAnswer).trim();
      
      // Debug logging
      console.log(`Question: "${q.question.substring(0, 50)}..."`, {
        userAnswer: ua,
        correctAnswer: correctAnswer,
        questionType: q.question_type,
        options: q.options
      });
      
      // For multiple choice, the user answer is the full option text selected
      // The correct answer should also be the full option text
      // Do a case-insensitive comparison of the actual values
      const isCorrect = ua.toLowerCase() === correctAnswer.toLowerCase();
      
      if (isCorrect) correct++;
      
      // Store answer details for the attempt
      answerDetails.push({
        question: q.question,
        studentAnswer: ua,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
      });
      
      return { ...q, userAnswer: ua, isCorrect };
    });

    const percentage = Math.round((correct / quiz.questions.length) * 100);
    const uid = currentUser.uid;
    const name = studentName;
    const email = currentUser.email || "";
    const attempts = quiz.attempts + 1;

    try {
      // Store the attempt with answer details
      const attemptData = {
        score: correct,
        total: quiz.questions.length,
        percentage,
        submittedAt: serverTimestamp(),
        visibleToStudent: true,
        attemptNumber: attempts,
        answers: answerDetails,
      };
      
      await addDoc(
        collection(db, `users/${uid}/results/${quiz.id}/attempts`),
        attemptData
      );

      // Update the main results document
      const resultsData = {
        quizId: quiz.id,
        studentId: uid,
        name,
        email,
        score: correct,
        total: quiz.questions.length,
        percentage,
        attempts,
        submittedAt: serverTimestamp(),
        answers: answerDetails,
      };
      
      await setDoc(
        doc(db, "users", uid, "results", quiz.id),
        resultsData,
        { merge: true }
      );

      // Update quiz results (for teacher view)
      await setDoc(
        doc(db, "quizzes", quiz.id, "results", uid),
        {
          quizId: quiz.id,
          studentId: uid,
          name,
          email,
          score: correct,
          total: quiz.questions.length,
          percentage,
          submittedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Update leaderboard stats
      await updateLeaderboardStats({ isPerfect: percentage === 100 });

      // Update local state
      setAssignedQuizzes((prev) =>
        prev.map((q) =>
          q.id === quiz.id
            ? {
                ...q,
                questions: markedQuestions,
                submitted: true,
                score: correct,
                attempts,
                percentage,
              }
            : q,
        ),
      );

      setActiveQuizId(null);
      setStartTime(null);
      
      toast.success(`✅ Quiz submitted successfully! You scored ${percentage}% (${correct}/${quiz.questions.length})`);
    } catch (err) {
      console.error("Submission error:", err);
      console.error("Error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      toast.error(`Failed to submit quiz: ${err.message || "Unknown error"}. Please try again.`);
    }
  };

  const handleRetake = (quiz) => {
    if (quiz.attempts >= 3) {
      toast.warning("⚠️ Maximum attempts reached (3).");
      return;
    }
    setAnswers((prev) => {
      const { [quiz.id]: _, ...rest } = prev;
      return rest;
    });
    setAssignedQuizzes((prev) =>
      prev.map((q) => (q.id === quiz.id ? { ...q, submitted: false } : q)),
    );
    setQIndex((prev) => ({ ...prev, [quiz.id]: 0 }));
    setActiveQuizId(quiz.id);
    setStartTime(Date.now());
    toast.info("Starting new attempt...");
  };

  const handleReview = async (quiz) => {
    if (quiz.visibleToStudents === false) {
      toast.info("📢 Your teacher has hidden the results for this quiz.");
      return;
    }
    
    // Check if student has attempts remaining
    if (quiz.attempts < 3) {
      toast.warning("⚠️ You can only view answers after using all 3 attempts.");
      return;
    }
    
    try {
      // Get the latest attempt
      const attQ = query(
        collection(
          db,
          `users/${currentUser.uid}/results/${quiz.id}/attempts`,
        ),
        orderBy("submittedAt", "desc"),
        limit(1),
      );
      const attSnap = await getDocs(attQ);
      
      if (attSnap.empty) {
        toast.error("No attempts found for this quiz.");
        return;
      }
      
      const latestAttempt = attSnap.docs[0].data();
      const vis = latestAttempt.visibleToStudent !== false;
      
      if (!vis) {
        toast.info("📢 Your teacher has hidden the result for this attempt.");
        return;
      }
      
      // Load the marked questions with correct/incorrect flags
      const attemptAnswers = latestAttempt.answers || [];
      
      if (attemptAnswers.length === 0) {
        toast.warning("Answer details not available for this attempt.");
        return;
      }
      
      // Map the answers back to the questions
      const markedQuestions = quiz.questions.map((q) => {
        const answerDetail = attemptAnswers.find(a => a.question === q.question);
        if (answerDetail) {
          return {
            ...q,
            userAnswer: answerDetail.studentAnswer,
            correctAnswer: answerDetail.correctAnswer,
            isCorrect: answerDetail.isCorrect,
          };
        }
        return {
          ...q,
          userAnswer: null,
          isCorrect: false,
        };
      });
      
      // Update the quiz in state with marked questions
      setAssignedQuizzes((prev) =>
        prev.map((q) =>
          q.id === quiz.id
            ? { ...q, questions: markedQuestions }
            : q
        )
      );
      
      setReviewingQuizId(quiz.id);
      setQIndex((prev) => ({ ...prev, [quiz.id]: 0 }));
    } catch (err) {
      console.error("Review error:", err);
      console.error("Error details:", {
        code: err?.code,
        message: err?.message,
        stack: err?.stack
      });
      toast.error(`Failed to load review: ${err.message || "Unknown error"}`);
    }
  };

  const handleStartQuiz = (quiz) => {
    setActiveQuizId(quiz.id);
    setQIndex((prev) => ({ ...prev, [quiz.id]: 0 }));
    setStartTime(Date.now());
  };

  /* Top-navbar action handlers */
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

  const goPrev = (quizId) =>
    setQIndex((prev) => ({
      ...prev,
      [quizId]: Math.max(0, (prev[quizId] || 0) - 1),
    }));
  const goNext = (quizId, total) =>
    setQIndex((prev) => ({
      ...prev,
      [quizId]: Math.min(total - 1, (prev[quizId] || 0) + 1),
    }));

  /* ────────────────────── Helper Functions */
  const getScoreColor = (percentage) => {
    if (percentage >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

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

  const getProgressPercentage = (quizId, total) => {
    const answeredCount = Object.keys(answers[quizId] || {}).length;
    return Math.round((answeredCount / total) * 100);
  };

  /* ────────────────────── Loading State */
  if (loading && !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF]">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#3399FF]"></div>
          <p className="text-lg text-[#333333]">Loading your quizzes...</p>
        </div>
      </div>
    );
  }

  /* ────────────────────── UI */
  return (
    <>
      {/* Global student top-navbar */}
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
        {/* Sidebar */}
        <StudentSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={(val) => {
            localStorage.setItem("sidebarMinimized", val);
            setSidebarMinimized(val);
          }}
        />

        {/* Main */}
        <div
          className={`flex-1 overflow-y-auto px-8 transition-all duration-300 ${
            sidebarMinimized ? "ml-[72px]" : "ml-[240px]"
          }`}
        >
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-bold text-[#3A3A3A]">My Quizzes</h1>
            <p className="text-[#666666]">
              {filteredQuizzes.length}{" "}
              {filteredQuizzes.length === 1 ? "quiz" : "quizzes"} available
            </p>
          </div>

          {/* Filters */}
          {!(activeQuizId || reviewingQuizId) && (
            <div className="mb-6 rounded-lg border border-[#DDDDDD] bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="diffFilter"
                    className="mb-1 block text-xs font-medium text-[#666666]"
                  >
                    Difficulty Level
                  </label>
                  <select
                    id="diffFilter"
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="w-full rounded-md border border-[#DDDDDD] bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3399FF]"
                  >
                    <option value="All">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="sortOrder"
                    className="mb-1 block text-xs font-medium text-[#666666]"
                  >
                    Sort By
                  </label>
                  <select
                    id="sortOrder"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full rounded-md border border-[#DDDDDD] bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3399FF]"
                  >
                    <option value="due-soon">
                      Due Date (Soonest First)
                    </option>
                    <option value="newest">Recently Assigned</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Exit Quiz View */}
          {(activeQuizId || reviewingQuizId) && (
            <div className="mb-6 text-right">
              <button
                onClick={() => {
                  setActiveQuizId(null);
                  setReviewingQuizId(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-500 px-5 py-2.5 font-semibold text-white hover:bg-gray-600 transition"
              >
                <XCircle size={18} />
                Exit Quiz View
              </button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="py-12 text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[#3399FF]"></div>
              <p className="text-[#666666]">⏳ Loading assigned quizzes…</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="rounded-lg border border-[#DDDDDD] bg-white py-12 text-center shadow-sm">
              <p className="mb-2 text-lg text-[#666666]">📚 No quizzes found</p>
              <p className="text-sm text-[#999999]">
                {difficultyFilter !== "All"
                  ? "Try changing the difficulty filter"
                  : "Your assigned quizzes will appear here"}
              </p>
            </div>
          ) : (
            (
              activeQuizId || reviewingQuizId
                ? filteredQuizzes.filter(
                    (q) => q.id === (activeQuizId || reviewingQuizId),
                  )
                : filteredQuizzes
            ).map((quiz) => {
              const isTaking = activeQuizId === quiz.id;
              const isReviewing = reviewingQuizId === quiz.id;
              const isActive = isTaking || isReviewing;
              const totalQs = quiz.questions.length;
              const currIdx = qIndex[quiz.id] ?? 0;
              const currQ = quiz.questions[currIdx];
              const progressPct = getProgressPercentage(
                quiz.id,
                totalQs,
              );

              return (
                <section
                  key={quiz.id}
                  className="mb-6 rounded-lg border-2 border-[#DDDDDD] bg-white p-6 shadow-lg transition-shadow hover:shadow-xl"
                >
                  {/* Quiz Header */}
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="mb-2 text-2xl font-bold text-[#3399FF]">
                        {quiz.title || "Untitled Quiz"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="flex items-center gap-1 text-[#666666]">
                          <Clock size={14} />
                          Due: {quiz.due}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 text-xs font-medium ${getDifficultyColor(
                            quiz.difficulty,
                          )}`}
                        >
                          {quiz.difficulty || "N/A"}
                        </span>
                        <span className="text-[#666666]">
                          {totalQs} {totalQs === 1 ? "Question" : "Questions"}
                        </span>
                      </div>
                      {quiz.visibleToStudents === false && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-[#B91C1C]">
                          🔒 Results hidden by teacher
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    {quiz.submitted && (
                      <div
                        className={`rounded-lg border-2 px-4 py-2 ${getScoreColor(
                          quiz.percentage,
                        )}`}
                      >
                        <div className="text-xs font-medium">Best Score</div>
                        <div className="text-2xl font-bold">
                          {quiz.percentage}%
                        </div>
                        <div className="text-xs">
                          {quiz.score}/{totalQs}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Quiz View */}
                  {isActive ? (
                    <div className="mt-6">
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-[#666666]">
                            Question {currIdx + 1} of {totalQs}
                          </span>
                          {!isReviewing && (
                            <span className="text-sm text-[#666666]">
                              Progress: {progressPct}%
                            </span>
                          )}
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] transition-all duration-300"
                            style={{
                              width: `${((currIdx + 1) / totalQs) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Question Card */}
                      <div className="mb-6 rounded-lg border-2 border-[#DDDDDD] bg-gradient-to-br from-[#F3F8FC] to-[#E8F6FF] p-6">
                        <div className="mb-4 flex items-start gap-3">
                          <span className="min-w-[40px] select-none rounded-md bg-[#3399FF] px-3 py-1 text-center text-sm font-bold text-white">
                            {currIdx + 1}
                          </span>
                          <p className="flex-1 text-lg font-semibold text-[#3A3A3A]">
                            {currQ.question}
                          </p>
                          {quiz.submitted &&
                            currQ.isCorrect !== undefined &&
                            quiz.visibleToStudents !== false &&
                            (currQ.isCorrect ? (
                              <CheckCircle
                                size={24}
                                className="text-green-600"
                              />
                            ) : (
                              <XCircle
                                size={24}
                                className="text-red-600"
                              />
                            ))}
                        </div>

                        {/* Multiple Choice */}
                        {currQ.question_type === "multiple_choice" && (
                          <div className="space-y-2">
                            {(currQ.options || []).map((ch, i) => {
                              // In review mode, use currQ.userAnswer; otherwise use answers state
                              const ua = isReviewing 
                                ? currQ.userAnswer 
                                : answers[quiz.id]?.[currQ.question];
                              const disabled =
                                quiz.submitted || isReviewing;
                              const isSelected = ua === ch || (ua && ch.startsWith(ua));
                              const correctAns = currQ.correctAnswer || currQ.answer || "";
                              const isCorrectAnswer =
                                quiz.submitted &&
                                quiz.visibleToStudents !== false &&
                                correctAns &&
                                ch
                                  .trim()
                                  .toLowerCase() ===
                                  correctAns.trim().toLowerCase();

                              return (
                                <label
                                  key={i}
                                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                                    disabled
                                      ? "cursor-not-allowed"
                                      : "hover:border-[#3399FF]"
                                  } ${
                                    isSelected
                                      ? "border-[#3399FF] bg-blue-50"
                                      : isCorrectAnswer
                                      ? "border-green-500 bg-green-50"
                                      : "border-[#DDDDDD] bg-white"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`${quiz.id}-${currQ.question}`}
                                    value={ch}
                                    disabled={disabled}
                                    checked={isSelected}
                                    onChange={(e) =>
                                      handleChange(
                                        quiz.id,
                                        currQ.question,
                                        e.target.value,
                                      )
                                    }
                                    className="h-5 w-5 accent-[#3399FF]"
                                  />
                                  <span className="flex-1 text-[#333333]">
                                    {ch}
                                  </span>
                                  {isCorrectAnswer && (
                                    <span className="text-xs font-bold text-green-600">
                                      CORRECT
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* True / False */}
                        {currQ.question_type === "true_false" && (
                          <div className="space-y-2">
                            {["True", "False"].map((choice, i) => {
                              // In review mode, use currQ.userAnswer; otherwise use answers state
                              const ua = isReviewing 
                                ? currQ.userAnswer 
                                : (answers[quiz.id]?.[currQ.question] || "");
                              const disabled =
                                quiz.submitted || isReviewing;
                              const isSelected = ua === choice || ua.toLowerCase() === choice.toLowerCase();
                              const correctAns = currQ.correctAnswer || currQ.answer || "";
                              const isCorrectAnswer =
                                quiz.submitted &&
                                quiz.visibleToStudents !== false &&
                                correctAns &&
                                choice
                                  .toLowerCase() ===
                                  correctAns.trim().toLowerCase();

                              return (
                                <label
                                  key={i}
                                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                                    disabled
                                      ? "cursor-not-allowed"
                                      : "hover:border-[#3399FF]"
                                  } ${
                                    isSelected
                                      ? "border-[#3399FF] bg-blue-50"
                                      : isCorrectAnswer
                                      ? "border-green-500 bg-green-50"
                                      : "border-[#DDDDDD] bg-white"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`${quiz.id}-${currQ.question}`}
                                    value={choice}
                                    disabled={disabled}
                                    checked={isSelected}
                                    onChange={(e) =>
                                      handleChange(
                                        quiz.id,
                                        currQ.question,
                                        e.target.value,
                                      )
                                    }
                                    className="h-5 w-5 accent-[#3399FF]"
                                  />
                                  <span className="flex-1 font-medium text-[#333333]">
                                    {choice}
                                  </span>
                                  {isCorrectAnswer && (
                                    <span className="text-xs font-bold text-green-600">
                                      CORRECT
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Navigation Buttons */}
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <button
                          onClick={() => goPrev(quiz.id)}
                          disabled={currIdx === 0}
                          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-all ${
                            currIdx === 0
                              ? "cursor-not-allowed bg-gray-200 text-gray-400"
                              : "border-2 border-[#3399FF] bg-white text-[#3399FF] hover:bg-[#E8F6FF]"
                          }`}
                        >
                          <ArrowLeft size={18} />
                          Previous
                        </button>

                        <button
                          onClick={() => goNext(quiz.id, totalQs)}
                          disabled={currIdx === totalQs - 1}
                          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-all ${
                            currIdx === totalQs - 1
                              ? "cursor-not-allowed bg-gray-200 text-gray-400"
                              : "bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] text-white hover:from-[#2A8AEE] hover:to-[#4BA0EE]"
                          }`}
                        >
                          Next
                          <ArrowRight size={18} />
                        </button>
                      </div>

                      {/* Submit Button */}
                      {!quiz.submitted && (
                        <div className="mb-4 rounded-md border-l-4 border-[#3399FF] bg-blue-50 p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle
                              size={20}
                              className="mt-0.5 text-[#3399FF]"
                            />
                            <div className="flex-1">
                              <p className="mb-1 text-sm font-medium text-[#3399FF]">
                                Ready to submit?
                              </p>
                              <p className="mb-3 text-xs text-[#666666]">
                                You've answered{" "}
                                {Object.keys(answers[quiz.id] || {}).length} of{" "}
                                {totalQs} questions.
                                {Object.keys(answers[quiz.id] || {}).length <
                                  totalQs &&
                                  " Please answer all questions before submitting."}
                              </p>
                              <button
                                onClick={() => handleSubmit(quiz)}
                                disabled={
                                  Object.keys(answers[quiz.id] || {}).length !==
                                  totalQs
                                }
                                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 font-bold transition-all ${
                                  Object.keys(answers[quiz.id] || {}).length !==
                                  totalQs
                                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                                    : "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:from-green-600 hover:to-green-700"
                                }`}
                              >
                                <CheckCircle size={18} />
                                Submit Quiz
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Results Display */}
                      {quiz.submitted && quiz.visibleToStudents !== false && (
                        <div
                          className={`rounded-lg border-2 p-6 ${getScoreColor(
                            quiz.percentage,
                          )}`}
                        >
                          <div className="flex items-center gap-4">
                            <Trophy
                              size={40}
                              className={
                                quiz.percentage >= 80
                                  ? "text-green-600"
                                  : quiz.percentage >= 60
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }
                            />
                            <div className="flex-1">
                              <h3 className="mb-1 text-lg font-bold">
                                Your Score: {quiz.score} / {totalQs} (
                                {quiz.percentage}%)
                              </h3>
                              <p className="text-sm opacity-80">
                                {quiz.percentage >= 80
                                  ? "Excellent work! 🎉"
                                  : quiz.percentage >= 60
                                  ? "Good job! Keep practicing. 👍"
                                  : "Keep trying! You'll do better next time. 💪"}
                              </p>
                            </div>
                            {isReviewing && (
                              <button
                                onClick={() => {
                                  setReviewingQuizId(null);
                                  setActiveQuizId(null);
                                }}
                                className="rounded-lg bg-gray-500 px-4 py-2 font-semibold text-white hover:bg-gray-600 transition"
                              >
                                Exit Review
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {quiz.submitted && quiz.visibleToStudents === false && (
                        <div className="rounded-md border-l-4 border-yellow-500 bg-yellow-50 p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle
                              size={20}
                              className="mt-0.5 text-yellow-600"
                            />
                            <div>
                              <p className="text-sm font-medium text-yellow-800">
                                Results Hidden
                              </p>
                              <p className="mt-1 text-xs text-yellow-700">
                                Your teacher has hidden the results for this
                                quiz. Check back later.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Quiz Summary Card */
                    <div className="mt-4">
                      {quiz.description && (
                        <p className="mb-4 text-sm text-[#666666]">
                          {quiz.description}
                        </p>
                      )}

                      {quiz.submitted && (
                        <div className="mb-4 rounded-lg border border-[#DDDDDD] bg-gradient-to-br from-[#F3F8FC] to-[#E8F6FF] p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="mb-1 text-sm text-[#666666]">
                                Last Attempt
                              </p>
                              <p className="text-2xl font-bold text-[#3399FF]">
                                {quiz.percentage}%
                              </p>
                              <p className="text-xs text-[#666666]">
                                {quiz.score} out of {totalQs} correct
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="mb-1 text-sm text-[#666666]">
                                Attempts
                              </p>
                              <p className="text-2xl font-bold text-[#3399FF]">
                                {quiz.attempts}/3
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        {!quiz.submitted ? (
                          <button
                            onClick={() => handleStartQuiz(quiz)}
                            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-[#2A8AEE] hover:to-[#4BA0EE]"
                          >
                            <span className="text-lg">🚀</span>
                            Start Quiz
                          </button>
                        ) : (
                          <>
                            {quiz.visibleToStudents !== false && (
                              <button
                                onClick={() => handleReview(quiz)}
                                disabled={quiz.attempts < 3}
                                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold shadow-md transition-all ${
                                  quiz.attempts < 3
                                    ? "cursor-not-allowed bg-gray-300 text-gray-500"
                                    : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700"
                                }`}
                              >
                                <Eye size={18} />
                                Review Answers
                                {quiz.attempts < 3 && (
                                  <span className="text-xs">
                                    ({3 - quiz.attempts} attempts left)
                                  </span>
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => handleRetake(quiz)}
                              disabled={quiz.attempts >= 3}
                              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold shadow-md transition-all ${
                                quiz.attempts >= 3
                                  ? "cursor-not-allowed bg-gray-300 text-gray-500"
                                  : "bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] text-white hover:from-[#2A8AEE] hover:to-[#4BA0EE]"
                              }`}
                            >
                              <RotateCcw size={18} />
                              Retake Quiz ({quiz.attempts}/3)
                            </button>
                          </>
                        )}
                      </div>

                      {quiz.attempts >= 3 && (
                        <p className="mt-3 flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle size={14} />
                          Maximum attempts reached. Contact your teacher if you
                          need more attempts.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}