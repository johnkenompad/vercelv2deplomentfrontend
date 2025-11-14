// components/NotificationBell.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Clock } from "lucide-react";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import {
  collectionGroup,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

/**
 * NotificationBell
 * ------------------------------------------------------------------
 * • Student: listens to `assignedTo` + personal `notifications`
 * • Teacher/Admin: listens to role-specific `notifications`
 * • Merges streams, dedups by full Firestore path
 * • Unique React keys fixed (now uses `path`)
 * ------------------------------------------------------------------
 */
export default function NotificationBell() {
  /* ───────── state ───────── */
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("student"); // default
  const bellRef = useRef(null);
  const navigate = useNavigate();

  /* ───────── Get user role ───────── */
  useEffect(() => {
    (async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setRole(snap.data().role || "student");
      } catch (e) {
        console.error("role-fetch:", e);
      }
    })();
  }, []);

  /* ───────── Helper to map snapshot → object ───────── */
  const mapDoc = useCallback(
    async (docSnap, fromAssigned) => {
      if (fromAssigned) {
        const d = docSnap.data();
        const quizId = docSnap.ref.parent.parent.id; // grand-parent doc id
        const quizSnap = await getDoc(doc(db, "quizzes", quizId));
        const quizTitle = quizSnap.exists() ? quizSnap.data().title : "Unnamed Quiz";

        return {
          id: docSnap.id,
          path: docSnap.ref.path,
          quizId,
          title: `📘 ${quizTitle}`,
          message: "Click to take this quiz.",
          timeTS: d.assignedAt?.toMillis() || Date.now(),
          timeStr: d.assignedAt?.toDate().toLocaleString() || "Just now",
          isRead: !!d.isRead,
        };
      }

      const n = docSnap.data();
      return {
        id: docSnap.id,
        path: docSnap.ref.path,
        quizId: n.quizId || null,
        title: n.title || "📢 New Notification",
        message: n.message || "",
        timeTS: n.timestamp?.toMillis() || Date.now(),
        timeStr: n.timestamp?.toDate().toLocaleString() || "Just now",
        isRead: n.read === false ? false : !!n.isRead, // support both flags
      };
    },
    []
  );

  /* ───────── Listen for notifications ───────── */
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const subs = [];

    /* — common queries — */
    const qAssigned = query(
      collectionGroup(db, "assignedTo"),
      where("studentId", "==", user.uid)
    );
    const qPersonal = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
    const qAdmin = query(collection(db, "notifications"), where("role", "==", "admin"));

    /* — merge-helper: dedup by path, sort desc — */
    const mergeAndSet = (incoming) => {
      setNotifications((prev) => {
        const map = new Map(prev.map((p) => [p.path, p]));
        incoming.forEach((n) => map.set(n.path, n));
        const merged = Array.from(map.values()).sort((a, b) => b.timeTS - a.timeTS);
        setHasUnread(merged.some((n) => !n.isRead));
        return merged;
      });
    };

    /* Student */
    if (role === "student") {
      subs.push(
        onSnapshot(qAssigned, async (snap) => {
          const arr = await Promise.all(snap.docs.map((d) => mapDoc(d, true)));
          mergeAndSet(arr);
        })
      );
      subs.push(
        onSnapshot(qPersonal, async (snap) => {
          const arr = await Promise.all(snap.docs.map((d) => mapDoc(d, false)));
          mergeAndSet(arr);
        })
      );
    }

    /* Teacher */
    if (role === "teacher") {
      subs.push(
        onSnapshot(qPersonal, async (snap) => {
          const arr = await Promise.all(snap.docs.map((d) => mapDoc(d, false)));
          mergeAndSet(arr);
        })
      );
    }

    /* Admin */
    if (role === "admin") {
      subs.push(
        onSnapshot(qAdmin, async (snap) => {
          const arr = await Promise.all(snap.docs.map((d) => mapDoc(d, false)));
          mergeAndSet(arr);
        })
      );
    }

    return () => subs.forEach((u) => u && u());
  }, [role, mapDoc]);

  /* ───────── Mark-as-read helpers ───────── */
  const markAsRead = async (n) => {
    if (n.isRead) return;
    try {
      await updateDoc(doc(db, n.path), { isRead: true, read: true });
    } catch (e) {
      console.error("mark-read:", e);
    }
  };

  const markAllAsRead = async () => {
    await Promise.all(notifications.filter((n) => !n.isRead).map(markAsRead));
    setHasUnread(false);
  };

  /* ───────── Toggle dropdown ───────── */
  const toggleDropdown = () => {
    const next = !open;
    setOpen(next);
    if (next) markAllAsRead();
  };

  /* ───────── Close on outside click ───────── */
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ───────── Navigate on click ───────── */
  const handleClick = async (n) => {
    await markAsRead(n);
    if (n.quizId) navigate("/take-quiz", { state: { quizId: n.quizId } });
    setOpen(false);
  };

  /* ───────── UI ───────── */
  return (
    <div className="relative" ref={bellRef}>
      {/* Bell */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 transition hover:scale-105 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6 text-white" />
        {hasUnread && (
          <>
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black/10">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h4 className="text-md font-semibold text-[#333333]">Notifications</h4>
              <p className="text-sm text-gray-500">
                {notifications.length ? `${notifications.length} total` : "No notifications yet"}
              </p>
            </div>
          </div>

          <div className="max-h-64 divide-y overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">🎉 All caught up!</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.path} /* 🔑 guaranteed unique */
                  onClick={() => handleClick(n)}
                  className={`w-full p-4 text-left transition hover:bg-[#E8F6FF] ${
                    !n.isRead ? "bg-[#F5F8FF]" : ""
                  }`}
                >
                  <div className="text-sm font-semibold text-[#1D4F91]">{n.title}</div>
                  <div className="text-xs text-gray-600">{n.message}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {n.timeStr}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
