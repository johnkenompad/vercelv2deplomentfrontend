/**
 * AssignedWordSearchPage.jsx – Student's assigned word searches
 * --------------------------------------------------------------------------
 * Shows all word searches assigned to the current student
 * --------------------------------------------------------------------------
 */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import StudentSidebar from "../../components/StudentSidebar";
import StudentTopNavBar from "../../components/StudentTopNavBar";

import { RefreshCw, Search } from "lucide-react";
import { toast } from "react-toastify";

export default function AssignedWordSearchPage() {
  /* ─────────────────────────────── State */
  const [assignedWordSearches, setAssignedWordSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true"
  );
  const [studentName, setStudentName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();
  const auth = getAuth();

  /* ─────────────────────────────── Auth */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      setCurrentUser(user);

      /* Fetch full name */
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          const fullName = [d.firstName, d.middleName, d.lastName]
            .filter(Boolean)
            .join(" ");
          setStudentName(
            fullName || user.displayName || user.email?.split("@")[0] || "Student"
          );
        } else {
          setStudentName(
            user.displayName || user.email?.split("@")[0] || "Student"
          );
        }
      } catch (err) {
        console.error("User data fetch error:", err);
        setStudentName(
          user.displayName || user.email?.split("@")[0] || "Student"
        );
      }
    });

    return () => unsub();
  }, [auth, navigate]);

  /* ─────────────────────────────── Fetch assigned word searches */
  const fetchAssignedWordSearches = useCallback(
    async (showToast = false) => {
      if (!currentUser) return;

      const isRefresh = !loading;
      isRefresh ? setRefreshing(true) : setLoading(true);

      try {
        const apiKey = process.env.REACT_APP_ADMIN_API_KEY;
        const response = await axios.get(
          `/api/wordsearch/assigned/${currentUser.uid}`,
          {
            headers: {
              "x-api-key": apiKey,
            },
          }
        );

        setAssignedWordSearches(response.data.wordSearches || []);

        if (showToast) {
          toast.success(
            `Refreshed! Found ${response.data.wordSearches?.length || 0} assigned word search${
              response.data.wordSearches?.length !== 1 ? "es" : ""
            }.`
          );
        }
      } catch (err) {
        console.error("🔥 Assigned word searches fetch error:", err);
        toast.error("Failed to load word searches. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUser, loading]
  );

  useEffect(() => {
    if (currentUser) fetchAssignedWordSearches();
  }, [currentUser]);

  /* ─────────────────────────────── Sorting */
  const sortedWordSearches = useMemo(() => {
    let sorted = [...assignedWordSearches];

    sorted.sort((a, b) => {
      const aDate = a.assignedAt?.toMillis?.() || a.assignedAt?._seconds * 1000 || 0;
      const bDate = b.assignedAt?.toMillis?.() || b.assignedAt?._seconds * 1000 || 0;
      return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
    });

    return sorted;
  }, [assignedWordSearches, sortOrder]);

  /* ─────────────────────────────── Handlers */
  const handleProfile = () => navigate("/student/profile");

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

  const handleRefresh = () => fetchAssignedWordSearches(true);
  
  const handleStartWordSearch = (wordSearchId) => {
    navigate(`/student/word-search/${wordSearchId}`);
  };

  /* ─────────────────────────────── Helpers */
  const formatDate = (ts) => {
    if (!ts) return "N/A";
    
    // Handle Firestore Timestamp
    if (ts.toDate) {
      try {
        const d = ts.toDate();
        return d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return "N/A";
      }
    }
    
    // Handle plain object with _seconds
    if (ts._seconds) {
      try {
        const d = new Date(ts._seconds * 1000);
        return d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return "N/A";
      }
    }
    
    return "N/A";
  };

  /* ─────────────────────────────── Loading screen */
  if (loading && !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF]">
        <div className="text-lg text-[#3399FF]">Loading your word searches...</div>
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
          <div className="mb-8 flex items-center justify-between pt-6">
            <h1 className="text-2xl font-bold text-[#3A3A3A]">
              Assigned Word Searches
              {assignedWordSearches.length > 0 && (
                <span className="ml-3 text-base font-normal text-[#666666]">
                  ({assignedWordSearches.length} total)
                </span>
              )}
            </h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-md border border-[#3399FF] bg-white px-4 py-2 text-sm font-medium text-[#3399FF] shadow-sm transition hover:bg-[#E8F6FF] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh word searches"
            >
              <RefreshCw
                size={16}
                strokeWidth={2}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* Sort */}
          <section className="mb-6 max-w-4xl">
            <div className="w-48">
              <label htmlFor="sort-order" className="mb-1 block text-xs font-medium text-[#666666]">
                Sort Order
              </label>
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full rounded-md border border-[#DDDDDD] bg-white px-4 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3399FF]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </section>

          {/* Assigned list */}
          <section className="max-w-4xl rounded-md border border-[#DDDDDD] bg-white p-6 shadow-sm mb-8">
            {loading ? (
              <LoadingBlock />
            ) : sortedWordSearches.length === 0 ? (
              <EmptyBlock />
            ) : (
              <ul className="space-y-4">
                {sortedWordSearches.map((ws) => (
                  <li
                    key={ws.id}
                    className="rounded-md border border-[#DDDDDD] bg-[#F3F8FC] p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="mb-2 text-lg font-semibold text-[#3399FF]">
                          <Search className="inline-block mr-2 h-5 w-5" />
                          {ws.title || "Untitled Word Search"}
                        </h3>

                        <div className="space-y-1">
                          <InfoLine
                            icon="📅"
                            text={`Assigned: ${formatDate(ws.assignedAt)}`}
                          />
                          {ws.dueDate && (
                            <InfoLine
                              icon="⏰"
                              text={`Due: ${formatDate(ws.dueDate)}`}
                            />
                          )}
                          <InfoLine
                            icon="🔤"
                            text={`${ws.words?.length || 0} words to find`}
                          />
                          {ws.timeLimit && (
                            <InfoLine
                              icon="⏱️"
                              text={`Time limit: ${ws.timeLimit} minutes`}
                            />
                          )}

                          {ws.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-[#666666]">
                              {ws.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartWordSearch(ws.id)}
                        className="rounded-md bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] px-5 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#2A8AEE] hover:to-[#4BA0EE]"
                        aria-label={`Start ${ws.title || "word search"}`}
                      >
                        Start Puzzle
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
      <p className="text-[#333333]/70">⏳ Loading assigned word searches…</p>
    </div>
  );
}

function EmptyBlock() {
  return (
    <div className="py-12 text-center">
      <p className="mb-2 text-lg text-[#333333]/70">
        🔍 No word searches assigned yet
      </p>
      <p className="text-sm text-[#666666]">
        Your assigned word searches will appear here once your teacher assigns them.
      </p>
    </div>
  );
}