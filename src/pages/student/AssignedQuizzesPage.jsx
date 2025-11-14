/**
 * AssignedQuizzesPage.jsx – vivid-blue design system (ENHANCED)
 * --------------------------------------------------------------------------
 * ✅ Fixed: Proper error handling and loading states
 * ✅ Fixed: Auth state management and navigation
 * ✅ Fixed: Better user feedback with toast notifications
 * ✅ Enhanced: Optimized data fetching with batch operations
 * ✅ Enhanced: Improved filter logic and performance
 * ✅ Enhanced: Better accessibility and UX
 * --------------------------------------------------------------------------
 */
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
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

import StudentSidebar    from "../../components/StudentSidebar";
import StudentTopNavBar  from "../../components/StudentTopNavBar";

import { RefreshCw }     from "lucide-react";
import { toast }         from "react-toastify";

export default function AssignedQuizzesPage() {
  /* ─────────────────────────────── State */
  const [assignedQuizzes,  setAssignedQuizzes]  = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [sortOrder,        setSortOrder]        = useState("newest");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [typeFilter,       setTypeFilter]       = useState("all");
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [studentName, setStudentName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();
  const auth     = getAuth();

  /* ─────────────────────────────── Auth */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      setCurrentUser(user);

      /* Fetch full name, fallback to auth info */
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          const fullName = [d.firstName, d.middleName, d.lastName]
            .filter(Boolean)
            .join(" ");
          setStudentName(fullName || user.displayName || user.email?.split("@")[0] || "Student");
        } else {
          setStudentName(user.displayName || user.email?.split("@")[0] || "Student");
        }
      } catch (err) {
        console.error("User data fetch error:", err);
        setStudentName(user.displayName || user.email?.split("@")[0] || "Student");
      }
    });

    return () => unsub();
  }, [auth, navigate]);

  /* ─────────────────────────────── Fetch assigned quizzes */
  const fetchAssignedQuizzes = useCallback(
    async (showToast = false) => {
      if (!currentUser) return;

      const isRefresh = !loading;
      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        const quizzesSnap = await getDocs(collection(db, "quizzes"));
        const assigned    = [];

        const checks = quizzesSnap.docs.map(async (qDoc) => {
          try {
            const assignedSnap = await getDoc(
              doc(db, "quizzes", qDoc.id, "assignedTo", currentUser.uid),
            );

            if (assignedSnap.exists()) {
              const quizData = qDoc.data();
              const asnData  = assignedSnap.data();

              return {
                id        : qDoc.id,
                ...quizData,
                assignedAt: asnData.assignedAt,
                dueDate   : asnData.dueDate || null,
              };
            }
            return null;
          } catch (err) {
            console.error(`Assignment fetch error (${qDoc.id}):`, err);
            return null;
          }
        });

        const results = await Promise.all(checks);
        const valid   = results.filter(Boolean);

        setAssignedQuizzes(valid);

        if (showToast) {
          toast.success(
            `Refreshed! Found ${valid.length} assigned quiz${valid.length !== 1 ? "es" : ""}.`,
          );
        }
      } catch (err) {
        console.error("🔥 Assigned quizzes fetch error:", err);
        toast.error("Failed to load quizzes. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUser, loading],
  );

  useEffect(() => {
    if (currentUser) fetchAssignedQuizzes();
  }, [currentUser]);

  /* ─────────────────────────────── Filters & Sorting */
  const filteredQuizzes = useMemo(() => {
    let filtered = [...assignedQuizzes];

    if (difficultyFilter !== "all") {
      filtered = filtered.filter(
        (q) => (q.difficulty || "").toLowerCase() === difficultyFilter,
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((q) => {
        const raw   = q.quizType;
        const types = Array.isArray(raw)
          ? raw.map((t) => t.toLowerCase())
          : String(raw).toLowerCase().split(/,\s*/);

        if (typeFilter === "mixed") return types.includes("mc") && types.includes("tf");
        return types.includes(typeFilter);
      });
    }

    filtered.sort((a, b) => {
      const aDate = a.assignedAt?.toMillis?.() || 0;
      const bDate = b.assignedAt?.toMillis?.() || 0;
      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    });

    return filtered;
  }, [assignedQuizzes, sortOrder, difficultyFilter, typeFilter]);

  /* ─────────────────────────────── Handlers */
  const handleProfile = () => navigate("/profile");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to logout. Please try again.");
    }
  };

  const handleRefresh  = () => fetchAssignedQuizzes(true);
  const handleQuizClick = (id) => navigate(`/quiz/details/${id}`);

  /* ─────────────────────────────── Helpers */
  const formatQuizType = (qt) => {
    if (!qt) return "Unknown";
    const types = Array.isArray(qt)
      ? qt
      : String(qt).split(/,\s*/).map((t) => t.toLowerCase());

    const labels = [];
    if (types.includes("mc")) labels.push("Multiple Choice");
    if (types.includes("tf")) labels.push("True or False");
    return labels.length ? labels.join(" and ") : "Unknown";
  };

  const formatDate = (ts) => {
    if (!ts?.toDate) return "N/A";
    try {
      const d = ts.toDate();
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "N/A";
    }
  };

  const difficultyBadge = (lvl) => {
    switch ((lvl || "").toLowerCase()) {
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

  /* ─────────────────────────────── Loading screen */
  if (loading && !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF]">
        <div className="text-lg text-[#3399FF]">Loading your quizzes...</div>
      </div>
    );
  }

  /* ─────────────────────────────── UI */
  return (
    <>
      {/* Top navbar */}
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      {/* Sidebar + content */}
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
          {/* Page header */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#3A3A3A]">
              Assigned Quizzes
              {assignedQuizzes.length > 0 && (
                <span className="ml-3 text-base font-normal text-[#666666]">
                  ({assignedQuizzes.length} total)
                </span>
              )}
            </h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-md border border-[#3399FF] bg-white px-4 py-2 text-sm font-medium text-[#3399FF] shadow-sm transition hover:bg-[#E8F6FF] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh quizzes"
            >
              <RefreshCw
                size={16}
                strokeWidth={2}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* Filters */}
          <section className="mb-6 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
            <FilterSelect
              id="difficulty-filter"
              label="Difficulty Level"
              value={difficultyFilter}
              onChange={setDifficultyFilter}
              options={[
                { v: "all",    t: "All Difficulties" },
                { v: "easy",   t: "Easy" },
                { v: "medium", t: "Medium" },
                { v: "hard",   t: "Hard" },
              ]}
            />
            <FilterSelect
              id="type-filter"
              label="Quiz Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { v: "all",   t: "All Quiz Types" },
                { v: "mc",    t: "Multiple Choice" },
                { v: "tf",    t: "True or False" },
                { v: "mixed", t: "Mixed" },
              ]}
            />
            <FilterSelect
              id="sort-order"
              label="Sort Order"
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { v: "newest", t: "Newest First" },
                { v: "oldest", t: "Oldest First" },
              ]}
            />
          </section>

          {/* Assigned list */}
          <section className="max-w-4xl rounded-md border border-[#DDDDDD] bg-white p-6 shadow-sm mb-8">
            {loading ? (
              <LoadingBlock />
            ) : filteredQuizzes.length === 0 ? (
              <EmptyBlock
                kind={assignedQuizzes.length === 0 ? "none" : "filters"}
              />
            ) : (
              <ul className="space-y-4">
                {filteredQuizzes.map((q) => (
                  <li
                    key={q.id}
                    className="rounded-md border border-[#DDDDDD] bg-[#F3F8FC] p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="mb-2 text-lg font-semibold text-[#3399FF]">
                          {q.title || "Untitled Quiz"}
                        </h3>

                        <div className="space-y-1">
                          <InfoLine icon="📅" text={`Assigned: ${formatDate(q.assignedAt)}`} />
                          <InfoLine
                            icon="🎯"
                            text={
                              <span
                                className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${difficultyBadge(
                                  q.difficulty,
                                )}`}
                              >
                                {q.difficulty || "N/A"}
                              </span>
                            }
                          />
                          <InfoLine icon="📘" text={formatQuizType(q.quizType)} />

                          {q.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-[#666666]">
                              {q.description}
                            </p>
                          )}
                        </div>

                        {q.visibleToStudents === false && (
                          <div className="mt-3 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-[#B91C1C]">
                            🔒 Results hidden by teacher
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleQuizClick(q.id)}
                        className="rounded-md bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#2A8AEE] hover:to-[#4BA0EE]"
                        aria-label={`View details for ${q.title || "quiz"}`}
                      >
                        View Details
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────── Sub-components */
function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-[#666666]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[#DDDDDD] bg-white px-4 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3399FF]"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoLine({ icon, text }) {
  return (
    <p className="flex items-center gap-2 text-sm text-[#333333]/70">
      <span>{icon}</span>
      <span>{text}</span>
    </p>
  );
}

function LoadingBlock() {
  return (
    <div className="py-12 text-center">
      <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[#3399FF]" />
      <p className="text-[#333333]/70">⏳ Loading assigned quizzes…</p>
    </div>
  );
}

function EmptyBlock({ kind }) {
  return (
    <div className="py-12 text-center">
      {kind === "none" ? (
        <>
          <p className="mb-2 text-lg text-[#333333]/70">📚 No quizzes assigned yet</p>
          <p className="text-sm text-[#666666]">
            Your assigned quizzes will appear here once your teacher assigns them.
          </p>
        </>
      ) : (
        <>
          <p className="mb-2 text-lg text-[#333333]/70">🔍 No quizzes match your filters</p>
          <p className="text-sm text-[#666666]">
            Try adjusting your filters to see more results.
          </p>
        </>
      )}
    </div>
  );
}
