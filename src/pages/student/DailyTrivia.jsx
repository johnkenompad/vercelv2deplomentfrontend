/* --------------------------------------------------------------------------  
   DailyTrivia.jsx – Student Daily Trivia Page (QuizRush ✨)
   ▸ Uses shared StudentTopNavBar
   ▸ Sidebar-collapse behaviour (ml-64 → ml-20) preserved
---------------------------------------------------------------------------*/

import React, { useEffect, useState } from "react";
import axios from "../../axiosConfig";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";
import {
  Trophy,
  Target,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Sparkles,
  Award,
} from "lucide-react";
import { db } from "../../firebase";
import { toast } from "react-toastify";

/* Shared layout components */
import StudentSidebar from "../../components/StudentSidebar";
import StudentTopNavBar from "../../components/StudentTopNavBar";

export default function DailyTrivia() {
  const auth = getAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  /* ────────────────────────────── Sidebar state */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true"
  );

  /* ────────────────────────────── Quiz State */
  const [topic, setTopic] = useState("General Knowledge");
  const [difficulty, setDifficulty] = useState("Easy");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  /* ────────────────────────────── Enhanced Features */
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  /* ────────────────────────────── Auth Guard & Stats */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) return navigate("/login");
      setUser(u);
      loadUserStats(u.uid);
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  const loadUserStats = async (uid) => {
    try {
      const triviaRef = collection(db, "users", uid, "dailyTrivia");
      const snap = await getDocs(triviaRef);

      let tot = 0;
      let sum = 0;
      const dates = [];

      snap.forEach((d) => {
        const data = d.data();
        tot += 1;
        sum += data.score || 0;
        dates.push(d.id);
      });

      setTotalCompleted(tot);
      setAverageScore(tot ? (sum / tot).toFixed(1) : 0);

      // streak calc
      const sorted = dates.sort().reverse();
      const today = new Date();
      let cur = 0;
      for (let i = 0; i < sorted.length; i++) {
        const diff = Math.floor(
          (today - new Date(sorted[i])) / (1000 * 60 * 60 * 24)
        );
        if (diff === i) cur += 1;
        else break;
      }
      setStreak(cur);
    } catch (err) {
      console.error("Stats load error →", err);
    }
  };

  /* ────────────────────────────── Timer */
  useEffect(() => {
    let interval;
    if (quizStarted && !submitted) {
      interval = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [quizStarted, submitted]);

  const handleLogout = () => {
    signOut(auth).then(() => navigate("/login"));
  };

  const handleProfile = () => navigate("/profile");

  /* ────────────────────────────── Generate Trivia */
  const handleGenerate = async () => {
    if (!topic || topic.trim() === "") {
      toast.warning("Please enter a topic for your trivia quiz.");
      return;
    }

    try {
      setLoading(true);
      console.log("Sending trivia request:", { topic, difficulty });
      
      const res = await axios.post("/api/daily-trivia/generate", {
        topic,
        difficulty,
      });
      
      console.log("Trivia response:", res.data);
      
      if (!res.data.questions || res.data.questions.length === 0) {
        toast.error("No questions were generated. Please try a different topic.");
        setLoading(false);
        return;
      }
      
      setQuestions(res.data.questions || []);
      setAnswers(new Array(res.data.questions.length).fill(null));
      setSubmitted(false);
      setQuizStarted(true);
      setCurrentQuestion(0);
      setTimeElapsed(0);
      setSelectedAnswer(null);
      setShowFeedback(false);
      toast.success(`Generated ${res.data.questions.length} questions!`);
    } catch (err) {
      console.error("Generate error →", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          baseURL: err.config?.baseURL,
          headers: err.config?.headers,
        }
      });
      
      let errorMessage = "Failed to generate trivia questions.";
      
      if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request made but no response
        errorMessage = "Cannot reach the server. Please check your internet connection.";
      } else {
        // Something else happened
        errorMessage = err.message || "An unexpected error occurred.";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };  /* ────────────────────────────── Quiz Handlers */
  const handleSelectAnswer = (idx) => {
    if (submitted) return;
    setSelectedAnswer(idx);
    setShowFeedback(true);

    const upd = [...answers];
    upd[currentQuestion] = idx;
    setAnswers(upd);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((q) => q + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 1500);
  };

  const handlePrevious = () => {
    if (currentQuestion === 0) return;
    setCurrentQuestion((q) => q - 1);
    setSelectedAnswer(answers[currentQuestion - 1]);
    setShowFeedback(false);
  };

  const handleNext = () => {
    if (currentQuestion >= questions.length - 1) return;
    setCurrentQuestion((q) => q + 1);
    setSelectedAnswer(answers[currentQuestion + 1]);
    setShowFeedback(false);
  };

  const handleSubmit = async () => {
    if (answers.includes(null)) {
      alert("Please answer all questions before submitting.");
      return;
    }
    setSubmitted(true);
    await saveResult();
    await loadUserStats(user.uid);
  };

  /* ────────────────────────────── Firestore Save */
  const saveResult = async () => {
    try {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const ref = doc(db, "users", user.uid, "dailyTrivia", today);
      const sc = answers.reduce(
        (a, v, i) => (v === questions[i]?.correctAnswer ? a + 1 : a),
        0
      );
      await setDoc(ref, {
        score: sc,
        answers,
        questions,
        topic,
        difficulty,
        timeElapsed,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Save error →", err);
    }
  };

  /* ────────────────────────────── Derived */
  const score = answers.reduce(
    (a, v, i) => (v === questions[i]?.correctAnswer ? a + 1 : a),
    0
  );
  const progress =
    questions.length > 0
      ? ((currentQuestion + 1) / questions.length) * 100
      : 0;
  const answered = answers.filter((a) => a !== null).length;

  const fmt = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const msg = () => {
    const pct = (score / questions.length) * 100;
    if (pct === 100) return "Perfect Score! 🏆";
    if (pct >= 80) return "Excellent Work! 🌟";
    if (pct >= 60) return "Good Job! 👍";
    if (pct >= 40) return "Keep Practicing! 💪";
    return "Don't Give Up! 📚";
  };

  /* ────────────────────────────── UI */
  return (
    <>
      {/* Shared top-navbar */}
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF]">
        {/* Sidebar */}
        <StudentSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={(v) => {
            localStorage.setItem("sidebarMinimized", v);
            setSidebarMinimized(v);
          }}
        />

        {/* Main */}
        <div
          className={`flex flex-1 flex-col overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          {/* Stats */}
          <div className="px-8 pt-6">
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                [
                  "Total Completed",
                  totalCompleted,
                  Trophy,
                  "bg-blue-100",
                  "text-blue-600",
                ],
                [
                  "Average Score",
                  `${averageScore}/5`,
                  Target,
                  "bg-green-100",
                  "text-green-600",
                ],
                [
                  "Current Streak",
                  `${streak} Days`,
                  TrendingUp,
                  "bg-orange-100",
                  "text-orange-600",
                ],
              ].map(([label, val, Icon, bg, color]) => (
                <div
                  key={label}
                  className="rounded-lg border border-[#DDDDDD] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`${bg} rounded-lg p-3`}>
                      <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-[#3A3A3A]">{label}</p>
                      <p className="text-2xl font-semibold text-[#3399FF]">
                        {val}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto w-full max-w-4xl px-8 pb-8">
            {!quizStarted ? (
              /* ───────────── Setup Panel ───────────── */
              <div className="rounded-2xl border border-[#DDDDDD] bg-white p-8 shadow-lg">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-[#3A3A3A]">
                    Ready for Today's Challenge?
                  </h2>
                  <p className="text-gray-600">
                    Choose your topic and difficulty level to begin
                  </p>
                </div>

                <div className="mb-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#3A3A3A]">
                      Topic
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Science, History, Technology"
                      className="w-full rounded-lg border border-[#DDDDDD] px-4 py-3 text-sm focus:border-[#3399FF] focus:ring-2 focus:ring-[#3399FF]/20 transition"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#3A3A3A]">
                      Difficulty Level
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {["Easy", "Medium", "Hard"].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setDifficulty(lvl)}
                          className={`rounded-lg py-3 font-medium transition ${
                            difficulty === lvl
                              ? "bg-[#3399FF] text-white shadow"
                              : "bg-gray-100 text-[#3A3A3A] hover:bg-gray-200"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full rounded-lg bg-[#3399FF] px-6 py-4 text-lg font-semibold text-white shadow transition hover:bg-[#2686e6] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating Questions...
                    </span>
                  ) : (
                    "Start Trivia Challenge"
                  )}
                </button>
              </div>
            ) : !submitted ? (
              /* ───────────── Active Quiz ───────────── */
              <>
                {/* Progress */}
                <div className="mb-4 rounded-lg border border-[#DDDDDD] bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#3A3A3A]">
                      Question {currentQuestion + 1} of {questions.length}
                    </span>
                    <div className="flex items-center gap-4 text-sm text-[#3A3A3A]">
                      <div className="flex items-center gap-1">
                        <Clock size={14} /> {fmt(timeElapsed)}
                      </div>
                      <span>
                        {answered}/{questions.length} Answered
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-[#3399FF] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Question */}
                <div className="rounded-2xl border border-[#DDDDDD] bg-white p-8 shadow-lg">
                  <div className="mb-6">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3399FF] font-bold text-white">
                        {currentQuestion + 1}
                      </div>
                      <h3 className="leading-relaxed text-xl font-semibold text-[#3A3A3A]">
                        {questions[currentQuestion]?.question}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {questions[currentQuestion]?.mcqs.map((choice, idx) => {
                      const isSel = selectedAnswer === idx;
                      const isCorrect =
                        idx === questions[currentQuestion]?.correctAnswer;
                      const show = showFeedback && isSel;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectAnswer(idx)}
                          disabled={show}
                          className={`w-full rounded-lg border p-4 text-left transition-all duration-300 ${
                            show
                              ? isCorrect
                                ? "border-green-500 bg-green-50 text-green-800"
                                : "border-red-500 bg-red-50 text-red-800"
                              : isSel
                              ? "border-[#3399FF] bg-[#E8F6FF]"
                              : "border-[#DDDDDD] hover:bg-[#EDF4FF]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                                show
                                  ? isCorrect
                                    ? "border-green-500 bg-green-500"
                                    : "border-red-500 bg-red-500"
                                  : isSel
                                  ? "border-[#3399FF] bg-[#3399FF]"
                                  : "border-[#DDDDDD]"
                              }`}
                            >
                              {show &&
                                (isCorrect ? (
                                  <CheckCircle2
                                    size={14}
                                    className="text-white"
                                  />
                                ) : (
                                  <XCircle size={14} className="text-white" />
                                ))}
                            </div>
                            <span className="font-medium">{choice}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Nav */}
                  <div className="mt-6 flex items-center justify-between border-t border-[#DDDDDD] pt-6">
                    <button
                      onClick={handlePrevious}
                      disabled={currentQuestion === 0}
                      className="rounded-md border border-[#DDDDDD] px-6 py-2 font-medium text-[#3A3A3A] transition hover:bg-[#EDF4FF] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>

                    {currentQuestion === questions.length - 1 ? (
                      <button
                        onClick={handleSubmit}
                        disabled={answered < questions.length}
                        className="rounded-md bg-[#28a745] px-8 py-3 font-semibold text-white transition hover:bg-[#1f8a38] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Submit Quiz
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        className="rounded-md bg-[#3399FF] px-6 py-2 font-medium text-white transition hover:bg-[#2686e6]"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* ───────────── Results Screen ───────────── */
              <div className="rounded-2xl border border-[#DDDDDD] bg-white p-8 shadow-lg">
                <div className="mb-8 text-center">
                  <div
                    className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${
                      score === questions.length
                        ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                        : score >= questions.length * 0.6
                        ? "bg-gradient-to-br from-green-400 to-emerald-500"
                        : "bg-gradient-to-br from-blue-400 to-purple-500"
                    }`}
                  >
                    <Award size={48} className="text-white" />
                  </div>
                  <h2 className="mb-2 text-3xl font-bold text-[#3A3A3A]">
                    {msg()}
                  </h2>
                  <p className="text-lg text-[#3A3A3A]">
                    You scored {score} out of {questions.length}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Completed in {fmt(timeElapsed)}
                  </p>
                </div>

                {/* Review */}
                <div className="mb-6 space-y-4">
                  <h3 className="text-lg font-semibold text-[#3A3A3A]">
                    Review Your Answers
                  </h3>
                  {questions.map((q, i) => {
                    const ua = answers[i];
                    const corr = ua === q.correctAnswer;
                    return (
                      <div
                        key={i}
                        className="rounded-lg border border-[#DDDDDD] p-4"
                      >
                        <div className="mb-3 flex items-start gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              corr ? "bg-green-100" : "bg-red-100"
                            }`}
                          >
                            {corr ? (
                              <CheckCircle2
                                size={20}
                                className="text-green-600"
                              />
                            ) : (
                              <XCircle size={20} className="text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="mb-2 font-medium text-[#3A3A3A]">
                              {i + 1}. {q.question}
                            </p>
                            <div className="space-y-1 text-sm">
                              <p
                                className={
                                  corr ? "text-green-700" : "text-red-700"
                                }
                              >
                                Your answer:{" "}
                                <span className="font-medium">
                                  {q.mcqs[ua]}
                                </span>
                              </p>
                              {!corr && (
                                <p className="text-green-700">
                                  Correct answer:{" "}
                                  <span className="font-medium">
                                    {q.mcqs[q.correctAnswer]}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setQuizStarted(false);
                      setSubmitted(false);
                      setQuestions([]);
                      setAnswers([]);
                      setCurrentQuestion(0);
                      setTimeElapsed(0);
                    }}
                    className="flex-1 rounded-md bg-[#3399FF] px-6 py-3 font-semibold text-white transition hover:bg-[#2686e6]"
                  >
                    Try Another Challenge
                  </button>
                  <button
                    onClick={() => navigate("/student-dashboard")}
                    className="flex-1 rounded-md border border-[#DDDDDD] px-6 py-3 font-semibold text-[#3A3A3A] transition hover:bg-[#EDF4FF]"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
