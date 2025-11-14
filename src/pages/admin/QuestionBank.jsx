// src/pages/admin/QuestionBank.jsx
import React, { useEffect, useState, useMemo } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import AdminTopNavBar from "../../components/AdminTopNavBar";
import {
  Eye,
  EyeOff,
  Search,
  Filter,
  X,
  ChevronDown,
  BookOpen,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

/**
 * QuestionBank.jsx – Production-ready admin interface (v3)
 * --------------------------------------------------------------------------
 *  • Added uniform 32 px (2 rem) internal gutter on both left & right:
 *      - Left padding = sidebar width (88 px / 256 px) + 32 px gap
 *      - Right padding remains 32 px via Tailwind `pr-8`
 * --------------------------------------------------------------------------
 */

export default function QuestionBank() {
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState({});

  const auth = getAuth();
  const navigate = useNavigate();

  /* Persist sidebar state */
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", sidebarMinimized);
  }, [sidebarMinimized]);

  /* Fetch quizzes */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return navigate("/");

      try {
        const snap = await getDocs(collection(db, "quizzes"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(0);
          const bTime = b.timestamp?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        setQuizzes(list);
      } catch (err) {
        console.error("Error fetching quizzes:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [auth, navigate]);

  /* Expand */
  const handleExpand = async (quiz) => {
    if (expandedId === quiz.id) return setExpandedId(null);
    setExpandedId(quiz.id);

    if (!details[quiz.id]) {
      setLoadingQuestions((prev) => ({ ...prev, [quiz.id]: true }));
      try {
        let qs = quiz.questions || [];
        if (qs.length === 0) {
          const qsSnap = await getDocs(
            collection(db, "quizzes", quiz.id, "questions"),
          );
          qs = qsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
        setDetails((prev) => ({ ...prev, [quiz.id]: qs }));
      } catch (err) {
        console.error("Error loading questions:", err);
      } finally {
        setLoadingQuestions((prev) => ({ ...prev, [quiz.id]: false }));
      }
    }
  };

  const handleLogout = () =>
    signOut(auth).then(() => navigate("/"));

  /* Filter + search */
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchesSearch = q.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesDifficulty =
        selectedDifficulty === "all" ||
        q.difficulty === selectedDifficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [quizzes, searchQuery, selectedDifficulty]);

  /* Stats */
  const stats = useMemo(() => {
    const totalQuestions = quizzes.reduce((sum, q) => {
      return sum + (q.questionIds?.length || q.questions?.length || 0);
    }, 0);
    const avgQuestions =
      quizzes.length ? Math.round(totalQuestions / quizzes.length) : 0;
    return { totalQuestions, avgQuestions };
  }, [quizzes]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDifficulty("all");
  };

  const hasActiveFilters = searchQuery || selectedDifficulty !== "all";

  const getDifficultyColor = (d) => {
    switch ((d || "").toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-700 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "hard":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  /* ─────────── UI ─────────── */
  return (
    <>
      <AdminTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={() => navigate("/profile")}
        onLogoutClick={handleLogout}
      />

      <div className="flex h-screen pt-14 bg-gradient-to-br from-[#E8F6FF] to-[#D9F0FF] text-[#333]">
        <AdminSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
        />

        <main
          className="flex-1 overflow-y-auto transition-all duration-300 pr-8 pt-8 pb-8"
          style={{
            paddingLeft: `calc(${sidebarMinimized ? 88 : 256}px + 32px)`,
          }}
        >
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-[#1D4F91] mb-2">
              Question Bank
            </h2>
            <p className="text-sm text-gray-600">
              Comprehensive overview of all quizzes and questions in the system
            </p>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Total Quizzes
                    </p>
                    <p className="text-2xl font-bold text-[#1D4F91]">
                      {quizzes.length}
                    </p>
                  </div>
                  <div className="bg-[#E8F6FF] p-3 rounded-lg">
                    <BookOpen className="text-[#3399FF]" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Total Questions
                    </p>
                    <p className="text-2xl font-bold text-[#1D4F91]">
                      {stats.totalQuestions}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <AlertCircle className="text-purple-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Avg Questions
                    </p>
                    <p className="text-2xl font-bold text-[#1D4F91]">
                      {stats.avgQuestions}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <TrendingUp className="text-orange-600" size={24} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search / Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search quizzes by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent"
                />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilters
                    ? "bg-[#3399FF] text-white border-[#3399FF]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Filter size={20} />
                Filters
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <X size={20} />
                  Clear
                </button>
              )}
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Count */}
          {!loading && (
            <p className="mb-4 text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">
                {filteredQuizzes.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold">
                {quizzes.length}
              </span>{" "}
              quizzes
            </p>
          )}

          {/* List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3399FF] mb-4"></div>
              <p className="text-sm text-gray-500">Loading quizzes...</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {hasActiveFilters
                  ? "No matching quizzes found"
                  : "No quizzes available"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {hasActiveFilters
                  ? "Try adjusting your filters or search query"
                  : "There are no quizzes in the system yet"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-[#3399FF] text-white rounded-lg hover:bg-[#2277DD] transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredQuizzes.map((quiz) => {
                const questionCount =
                  quiz.questionIds?.length ||
                  quiz.questions?.length ||
                  0;

                return (
                  <div
                    key={quiz.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-[#1D4F91] mb-2 truncate">
                            {quiz.title}
                          </h3>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDifficultyColor(
                                quiz.difficulty,
                              )}`}
                            >
                              {quiz.difficulty || "Unknown"}
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              <BookOpen size={12} />
                              {questionCount} Question
                              {questionCount !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Metadata */}
                          {quiz.timestamp?.toDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} />
                              Created{" "}
                              {quiz.timestamp
                                .toDate()
                                .toLocaleDateString()}{" "}
                              at{" "}
                              {quiz.timestamp
                                .toDate()
                                .toLocaleTimeString()}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleExpand(quiz)}
                          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                            expandedId === quiz.id
                              ? "bg-[#3399FF] text-white hover:bg-[#2277DD]"
                              : "bg-white text-[#3399FF] border border-[#3399FF] hover:bg-[#E8F6FF]"
                          }`}
                        >
                          {expandedId === quiz.id ? (
                            <>
                              <EyeOff size={16} />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <Eye size={16} />
                              View Details
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Details */}
                    {expandedId === quiz.id && (
                      <div className="border-t border-gray-200 bg-gradient-to-b from-[#F9FCFF] to-white p-5">
                        {loadingQuestions[quiz.id] ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3399FF]"></div>
                          </div>
                        ) : details[quiz.id]?.length ? (
                          <>
                            <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                              Questions ({details[quiz.id].length})
                            </h4>
                            <div className="space-y-6">
                              {details[quiz.id].map((q, idx) => {
                                const correct =
                                  q.correctAnswer ??
                                  q.correct ??
                                  q.answer ??
                                  "";
                                const isTrueFalse = ["true", "false"].includes(
                                  String(correct).toLowerCase(),
                                );

                                return (
                                  <div
                                    key={q.id}
                                    className="bg-white rounded-lg border border-gray-200 p-4 hover:border-[#3399FF] transition-colors"
                                  >
                                    {/* Question */}
                                    <div className="flex gap-3 mb-3">
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3399FF] text-white flex items-center justify-center text-sm font-semibold">
                                        {idx + 1}
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-[#1D4F91] leading-relaxed">
                                          {q.question}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Options */}
                                    <div className="ml-11">
                                      {q.options && q.options.length ? (
                                        <div className="space-y-2">
                                          {q.options.map((opt, optIdx) => {
                                            const isCorrect =
                                              opt === correct;
                                            return (
                                              <div
                                                key={optIdx}
                                                className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${
                                                  isCorrect
                                                    ? "bg-green-50 border-green-300"
                                                    : "bg-gray-50 border-gray-200"
                                                }`}
                                              >
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium bg-white">
                                                  {String.fromCharCode(
                                                    65 + optIdx,
                                                  )}
                                                </span>
                                                <span
                                                  className={`flex-1 text-sm ${
                                                    isCorrect
                                                      ? "font-semibold text-green-800"
                                                      : "text-gray-700"
                                                  }`}
                                                >
                                                  {opt}
                                                </span>
                                                {isCorrect && (
                                                  <span className="flex-shrink-0 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
                                                    Correct
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : isTrueFalse ? (
                                        <div className="space-y-2">
                                          {["True", "False"].map((opt) => {
                                            const isCorrect =
                                              opt.toLowerCase() ===
                                              String(correct).toLowerCase();
                                            return (
                                              <div
                                                key={opt}
                                                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                                                  isCorrect
                                                    ? "bg-green-50 border-green-300"
                                                    : "bg-gray-50 border-gray-200"
                                                }`}
                                              >
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium bg-white">
                                                  {opt[0]}
                                                </span>
                                                <span
                                                  className={`flex-1 text-sm ${
                                                    isCorrect
                                                      ? "font-semibold text-green-800"
                                                      : "text-gray-700"
                                                  }`}
                                                >
                                                  {opt}
                                                </span>
                                                {isCorrect && (
                                                  <span className="flex-shrink-0 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
                                                    Correct
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-500 italic">
                                          No options available
                                        </p>
                                      )}

                                      {/* Correct Answer Badge */}
                                      {correct &&
                                        !isTrueFalse &&
                                        (!q.options || q.options.length === 0) && (
                                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-xs text-green-800">
                                              <span className="font-semibold">
                                                Correct Answer:
                                              </span>{" "}
                                              {correct}
                                            </p>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                              <AlertCircle
                                className="text-gray-400"
                                size={24}
                              />
                            </div>
                            <p className="text-sm text-gray-500">
                              No question details available for this quiz
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
