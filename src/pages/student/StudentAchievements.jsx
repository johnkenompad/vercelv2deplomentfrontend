/* --------------------------------------------------------------------------
   StudentAchievements.jsx – Achievements & Leaderboard (Production Ready)
---------------------------------------------------------------------------*/
import React, { useEffect, useState, useCallback } from "react";
import {
  Trophy,
  Star,
  Target,
  Award,
  TrendingUp,
  Users,
  Crown,
  Menu,
  Medal,
  Flame,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  where,
  query,
} from "firebase/firestore";
import { db } from "../../firebase";

import StudentSidebar from "../../components/StudentSidebar";
import StudentTopNavBar from "../../components/StudentTopNavBar";
import { toast } from "react-toastify";

/* ───────── Achievement Tiers ───────── */
const ACHIEVEMENT_TIERS = {
  DEFAULT: { name: "Default", color: "#6e7681", bgColor: "#f3f4f6" },
  BRONZE: { name: "Bronze", color: "#cd7f32", bgColor: "#fef3c7" },
  SILVER: { name: "Silver", color: "#94a3b8", bgColor: "#f1f5f9" },
  GOLD: { name: "Gold", color: "#fbbf24", bgColor: "#fef9c3" },
};

/* ───────── Achievement Definitions ───────── */
const ACHIEVEMENTS = {
  QUIZ_ROOKIE: {
    id: "quiz_rookie",
    name: "Quiz Rookie",
    description: "Complete your first quiz",
    icon: "🎯",
    category: "completion",
    tiers: [
      { tier: "DEFAULT", requirement: 1, points: 10 },
      { tier: "BRONZE", requirement: 10, points: 50 },
      { tier: "SILVER", requirement: 50, points: 150 },
      { tier: "GOLD", requirement: 100, points: 500 },
    ],
  },
  PERFECT_SCORE: {
    id: "perfect_score",
    name: "Perfectionist",
    description: "Score 100% on a quiz",
    icon: "💯",
    category: "accuracy",
    tiers: [
      { tier: "DEFAULT", requirement: 1, points: 25 },
      { tier: "BRONZE", requirement: 5, points: 75 },
      { tier: "SILVER", requirement: 15, points: 225 },
      { tier: "GOLD", requirement: 50, points: 750 },
    ],
  },
  STREAK_MASTER: {
    id: "streak_master",
    name: "Streak Master",
    description: "Maintain a daily quiz streak",
    icon: "🔥",
    category: "consistency",
    tiers: [
      { tier: "DEFAULT", requirement: 3, points: 15 },
      { tier: "BRONZE", requirement: 7, points: 45 },
      { tier: "SILVER", requirement: 30, points: 135 },
      { tier: "GOLD", requirement: 100, points: 450 },
    ],
  },
};

/* ───────── Leaderboard sort & timeframe options ───────── */
const SORT_OPTIONS = [
  { id: "totalPoints", label: "Total Points" },
  { id: "quizzesCompleted", label: "Quizzes Completed" },
  { id: "perfectScores", label: "Perfect Scores" },
  { id: "currentStreak", label: "Current Streak" },
];

const TIMEFRAME_OPTIONS = [
  { id: "all", label: "All-Time" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

/* ───────── Helper: total points from unlocked tiers ───────── */
const calculateTotalPoints = (achievements) =>
  Object.keys(achievements).reduce((sum, key) => {
    const parts = key.split("_");
    const tier = parts.pop();
    const id = parts.join("_");
    const ach = Object.values(ACHIEVEMENTS).find((a) => a.id === id);
    const tierInfo = ach?.tiers.find((t) => t.tier === tier);
    return sum + (tierInfo?.points || 0);
  }, 0);

/* Helper: compute points given raw stats */
const computePlayerPoints = ({ quizzesCompleted = 0, perfectScores = 0, currentStreak = 0 }) => {
  const achievements = {};
  const unlock = (ach, val) =>
    ach.tiers.forEach((t) => {
      if (val >= t.requirement) achievements[`${ach.id}_${t.tier}`] = { points: t.points };
    });
  unlock(ACHIEVEMENTS.QUIZ_ROOKIE, quizzesCompleted);
  unlock(ACHIEVEMENTS.PERFECT_SCORE, perfectScores);
  unlock(ACHIEVEMENTS.STREAK_MASTER, currentStreak);
  return calculateTotalPoints(achievements);
};

/* -------------------------------------------------------------------------- */
export default function StudentAchievements() {
  const navigate = useNavigate();
  const auth = getAuth();

  /* ───────── UI / control state ───────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const handleSidebarToggle = (val) => {
    localStorage.setItem("sidebarMinimized", val);
    setSidebarMinimized(val);
  };
  const [activeTab, setActiveTab] = useState("achievements");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("totalPoints");
  const [timeframe, setTimeframe] = useState("all");

  /* ───────── Data state ───────── */
  const [uid, setUid] = useState("");
  const [userProgress, setUserProgress] = useState({
    quizzesCompleted: 0,
    perfectScores: 0,
    currentStreak: 0,
    totalPoints: 0,
    achievements: {},
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);

  /* ───────── Leaderboard fetch helper ───────── */
  const fetchLeaderboard = useCallback(
    async (field, tf) => {
      try {
        let qRef = collection(db, "leaderboard");
        if (tf !== "all") {
          const now = new Date();
          let start;
          if (tf === "week") {
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
          } else {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
          }
          qRef = query(qRef, where("updatedAt", ">=", start));
        }

        const snap = await getDocs(qRef);
        const rows = [];
        snap.forEach((d) => {
          const data = d.data();
          const totalPoints = computePlayerPoints(data);
          rows.push({ id: d.id, ...data, totalPoints });
        });

        const sorted = rows.sort((a, b) => (b[field] || 0) - (a[field] || 0));
        const ranked = sorted.map((e, idx) => ({ ...e, rank: idx + 1 }));

        setLeaderboard(ranked.slice(0, 10));

        const me = ranked.find((e) => e.uid === uid);
        setUserRank(me ? me.rank : null);
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
        toast.error("Failed to load leaderboard");
      }
    },
    [uid],
  );

  /* ───────── Initial load ───────── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return navigate("/login");
      setUid(user.uid);

      try {
        const lbSnap = await getDoc(doc(db, "leaderboard", user.uid));
        const lb = lbSnap.exists() ? lbSnap.data() : {};

        const quizzesCompleted = lb.quizzesCompleted || 0;
        const perfectScores = lb.perfectScores || 0;
        const currentStreak = lb.currentStreak || 0;

        /* achievements based on these stats */
        const achievements = {};
        const unlock = (ach, val) =>
          ach.tiers.forEach((t) => {
            if (val >= t.requirement)
              achievements[`${ach.id}_${t.tier}`] = { points: t.points };
          });
        unlock(ACHIEVEMENTS.QUIZ_ROOKIE, quizzesCompleted);
        unlock(ACHIEVEMENTS.PERFECT_SCORE, perfectScores);
        unlock(ACHIEVEMENTS.STREAK_MASTER, currentStreak);

        const totalPoints = calculateTotalPoints(achievements);

        setUserProgress({
          quizzesCompleted,
          perfectScores,
          currentStreak,
          totalPoints,
          achievements,
        });

        await fetchLeaderboard(sortBy, timeframe);
      } catch (err) {
        toast.error("Failed to load statistics.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth, navigate, fetchLeaderboard, sortBy, timeframe]);

  /* ───────── Re-fetch leaderboard on sort / timeframe change ───────── */
  useEffect(() => {
    if (uid) fetchLeaderboard(sortBy, timeframe);
  }, [sortBy, timeframe, uid, fetchLeaderboard]);

  /* ───────── Achievement helpers / card ───────── */
  const getAchievementProgress = (a) => {
    switch (a.id) {
      case "quiz_rookie":
        return userProgress.quizzesCompleted;
      case "perfect_score":
        return userProgress.perfectScores;
      case "streak_master":
        return userProgress.currentStreak;
      default:
        return 0;
    }
  };

  const AchievementCard = ({ achievement }) => {
    const progress = getAchievementProgress(achievement);
    const highest = achievement.tiers
      .slice()
      .reverse()
      .find((t) => userProgress.achievements[`${achievement.id}_${t.tier}`]);

    return (
      <div className="group rounded-xl border border-gray-200 bg-white p-6 shadow-md transition-all hover:border-[#3399FF] hover:shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#3399FF]/10 to-[#3399FF]/5 text-3xl">
            {achievement.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800">
              {achievement.name}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {achievement.description}
            </p>
            {highest && (
              <div
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: ACHIEVEMENT_TIERS[highest.tier].bgColor,
                  color: ACHIEVEMENT_TIERS[highest.tier].color,
                }}
              >
                <Medal className="h-3.5 w-3.5" />
                {ACHIEVEMENT_TIERS[highest.tier].name.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Tier progress */}
        <div className="space-y-4">
          {achievement.tiers.map((t) => {
            const unlocked =
              userProgress.achievements[`${achievement.id}_${t.tier}`];
            const pct = Math.min(100, (progress / t.requirement) * 100);
            const tierData = ACHIEVEMENT_TIERS[t.tier];

            return (
              <div key={t.tier} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span style={{ color: tierData.color }}>{tierData.name}</span>
                  <span className="text-gray-600">
                    {progress} / {t.requirement}
                  </span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: unlocked ? tierData.color : "#e5e7eb",
                    }}
                  />
                  {unlocked && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 drop-shadow-md" />
                    </div>
                  )}
                </div>
                {unlocked && (
                  <div className="text-right text-xs font-medium text-gray-500">
                    +{t.points} points
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Progress */}
        <div className="mt-5 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              Overall Progress
            </span>
            <span className="text-lg font-bold text-[#3399FF]">
              {progress} / {achievement.tiers.at(-1).requirement}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3399FF] to-[#66B3FF] transition-all duration-700"
              style={{
                width: `${Math.min(
                  100,
                  (progress / achievement.tiers.at(-1).requirement) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  /* ───────── profile / logout ───────── */
  const handleProfile = () => navigate("/profile");
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  /* ───────── Loading ───────── */
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#E8F6FF] to-[#D9F0FF]">
        <div className="mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-t-4 border-[#3399FF]" />
        <span className="text-xl font-semibold text-gray-700">
          Loading Achievements…
        </span>
      </div>
    );
  }

  /* ───────── UI ───────── */
  return (
    <>
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={handleSidebarToggle}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      <div className="flex h-screen bg-gradient-to-br from-[#E8F6FF] to-[#D9F0FF] pt-14">
        <StudentSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={handleSidebarToggle}
        />

        <div
          className={`flex flex-1 flex-col overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          } p-6 md:p-10`}
        >
          {/* Mobile sidebar toggle */}
          <div className="mb-6 flex items-center justify-between md:hidden">
            <button
              onClick={() => handleSidebarToggle(!sidebarMinimized)}
              className="rounded-lg bg-white p-2.5 shadow-md transition hover:bg-gray-50"
            >
              <Menu className="h-6 w-6 text-[#3399FF]" />
            </button>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#3399FF] to-[#66B3FF] shadow-lg">
                <Trophy className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-800">
                Achievements & Leaderboard
              </h1>
            </div>
            <p className="ml-15 text-sm text-gray-600">
              Track your progress and compete with other students
            </p>
          </div>

          {/* Quick Stats Cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "Quizzes Completed",
                value: userProgress.quizzesCompleted,
                icon: Target,
                color: "#3399FF",
                bgGradient: "from-blue-50 to-blue-100/50",
              },
              {
                label: "Perfect Scores",
                value: userProgress.perfectScores,
                icon: Award,
                color: "#10B981",
                bgGradient: "from-green-50 to-green-100/50",
              },
              {
                label: "Current Streak",
                value: userProgress.currentStreak,
                icon: Flame,
                color: "#F59E0B",
                bgGradient: "from-orange-50 to-orange-100/50",
              },
              {
                label: "Total Points",
                value: userProgress.totalPoints,
                icon: TrendingUp,
                color: "#8B5CF6",
                bgGradient: "from-purple-50 to-purple-100/50",
              },
            ].map(({ label, value, icon: Icon, color, bgGradient }) => (
              <div
                key={label}
                className={`rounded-xl bg-gradient-to-br ${bgGradient} border border-gray-200 p-5 shadow-md transition-all hover:scale-105 hover:shadow-lg`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-5 w-5" style={{ color }} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    {label}
                  </span>
                </div>
                <div className="text-3xl font-extrabold" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Primary Tabs */}
          <div className="mb-6 flex flex-wrap gap-3">
            {[
              { id: "achievements", icon: Trophy, label: "My Achievements" },
              { id: "leaderboard", icon: Users, label: "Leaderboard" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold transition-all ${
                  activeTab === id
                    ? "bg-gradient-to-r from-[#3399FF] to-[#66B3FF] text-white shadow-lg scale-105"
                    : "border-2 border-gray-200 bg-white text-gray-700 hover:border-[#3399FF] hover:bg-gray-50"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "achievements" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Object.values(ACHIEVEMENTS).map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
              {/* Leaderboard Header */}
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-md">
                    <Crown className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Top Players
                  </h2>
                </div>

                {/* Controls Row */}
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">
                      Sort by:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition focus:border-[#3399FF] focus:outline-none focus:ring-2 focus:ring-[#3399FF]/20"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Timeframe Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">
                      Period:
                    </span>
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition focus:border-[#3399FF] focus:outline-none focus:ring-2 focus:ring-[#3399FF]/20"
                    >
                      {TIMEFRAME_OPTIONS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* User Rank Badge */}
                  {userRank && (
                    <div className="rounded-xl border-2 border-[#3399FF]/20 bg-gradient-to-r from-[#3399FF]/10 to-[#66B3FF]/10 px-5 py-2.5">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Your Rank
                      </div>
                      <div className="text-2xl font-extrabold text-[#3399FF]">
                        #{userRank}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Leaderboard Body */}
              {leaderboard.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                    <Users className="h-10 w-10 text-gray-300" />
                  </div>
                  <p className="text-lg font-semibold text-gray-600">
                    No leaderboard data yet
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Complete quizzes to appear on the leaderboard!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((p) => {
                    const isMe = p.uid === uid;
                    const metricValue = p[sortBy] || 0;
                    const metricLabel =
                      SORT_OPTIONS.find((o) => o.id === sortBy)?.label ||
                      "score";

                    const medalStyle =
                      p.rank === 1
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg border-2 border-yellow-600"
                        : p.rank === 2
                        ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md border-2 border-gray-500"
                        : p.rank === 3
                        ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-md border-2 border-orange-600"
                        : "bg-white border-2 border-gray-300 text-gray-700";

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-4 rounded-xl p-5 transition-all ${
                          isMe
                            ? "border-2 border-[#3399FF] bg-gradient-to-r from-[#E8F6FF] to-[#D9F0FF] shadow-lg scale-105"
                            : "border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md"
                        }`}
                      >
                        {/* Rank Badge */}
                        <div
                          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold ${medalStyle}`}
                        >
                          {p.rank <= 3 ? (
                            <Crown className="h-7 w-7" />
                          ) : (
                            p.rank
                          )}
                        </div>

                        {/* Player Info */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="truncate text-lg font-bold text-gray-800">
                              {p.username || "Anonymous"}
                            </span>
                            {isMe && (
                              <span className="rounded-full bg-[#3399FF] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-gray-600">
                            <span className="flex items-center gap-1">
                              <Target className="h-3.5 w-3.5" />
                              {p.quizzesCompleted || 0} quizzes
                            </span>
                            <span className="flex items-center gap-1">
                              <Award className="h-3.5 w-3.5" />
                              {p.perfectScores || 0} perfect
                            </span>
                            {(p.currentStreak || 0) > 0 && (
                              <span className="flex items-center gap-1 text-orange-600">
                                <Flame className="h-3.5 w-3.5" />
                                {p.currentStreak} streak
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score Display */}
                        <div className="text-right">
                          <div className="text-3xl font-extrabold text-gray-800">
                            {metricValue}
                          </div>
                          <div className="text-xs font-medium capitalize text-gray-500">
                            {metricLabel.toLowerCase()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
