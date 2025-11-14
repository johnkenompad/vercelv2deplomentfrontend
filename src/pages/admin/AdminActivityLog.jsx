/* --------------------------------------------------------------------------  
   AdminActivityLog.jsx – production-ready activity-log page  
   --------------------------------------------------------------------------*/
import React, { useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

import AdminSidebar from "../../components/AdminSidebar";
import AdminTopNavBar from "../../components/AdminTopNavBar";
import { Loader2 } from "lucide-react";

export default function AdminActivityLog() {
  /* ─────────────────────────────── State */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [adminReady, setAdminReady] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();

  /* ─────────────────────────────── Auth guard */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
      else setAdminReady(true);
    });
    return () => unsub();
  }, [auth, navigate]);

  /* Persist sidebar preference */
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", sidebarMinimized);
  }, [sidebarMinimized]);

  /* ─────────────────────────────── Helpers */
  const nameCacheRef = useRef({});
  const resolveName = async (uid = "") => {
    if (!uid) return "Unknown";
    if (nameCacheRef.current[uid]) return nameCacheRef.current[uid];
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const { displayName, name, email } = snap.data();
        const pretty = displayName || name || email || uid;
        nameCacheRef.current[uid] = pretty;
        return pretty;
      }
    } catch {
      /* ignore */
    }
    nameCacheRef.current[uid] = uid;
    return uid;
  };

  /* ─────────────────────────────── Fetch logs */
  useEffect(() => {
    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const list = [];

        /* Quiz creations + assignments */
        const quizSnap = await getDocs(collection(db, "quizzes"));
        await Promise.all(
          quizSnap.docs.map(async (q) => {
            const d = q.data();
            const title = d.title || "Untitled";

            list.push({
              action: "Created Quiz",
              quiz: title,
              user: await resolveName(d.created_by),
              time: d.created_at?.toDate?.() || new Date(0),
            });

            const assignSnap = await getDocs(
              collection(db, `quizzes/${q.id}/assignedTo`),
            );
            await Promise.all(
              assignSnap.docs.map(async (a) => {
                const ad = a.data();
                list.push({
                  action: "Assigned Quiz",
                  quiz: title,
                  user: await resolveName(ad.studentId),
                  time: ad.assignedAt?.toDate?.() || new Date(0),
                });
              }),
            );
          }),
        );

        /* Quiz submissions */
        const resSnap = await getDocs(collectionGroup(db, "results"));
        await Promise.all(
          resSnap.docs.map(async (r) => {
            const rd = r.data();
            list.push({
              action: "Submitted Quiz",
              quiz: rd.quizTitle || "Untitled",
              user: await resolveName(rd.studentId || rd.userId),
              time: rd.submittedAt?.toDate?.() || new Date(0),
            });
          }),
        );

        list.sort((a, b) => b.time - a.time);
        setLogs(list);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchLogs();
  }, []);

  /* ─────────────────────────────── Handlers */
  const handleProfile = () => navigate("/admin-dashboard/settings");
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (!adminReady) return null;

  /* ─────────────────────────────── UI */
  return (
    <>
      <AdminTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
        <AdminSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
        />

        <main
          className={`flex-1 overflow-y-auto px-6 py-8 transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          <h1 className="mb-6 text-2xl font-bold text-[#3A3A3A]">
            Admin Activity Log
          </h1>

          <div className="overflow-x-auto rounded-xl border border-[#DDDDDD] bg-white shadow">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin" size={32} />
              </div>
            ) : logs.length === 0 ? (
              <p className="py-6 text-center text-[#666666]">
                No logs available.
              </p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-[#E8F6FF]">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">
                      Timestamp
                    </th>
                    <th className="px-4 py-2 text-left font-medium">Action</th>
                    <th className="px-4 py-2 text-left font-medium">User</th>
                    <th className="px-4 py-2 text-left font-medium">Quiz</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr
                      key={i}
                      className="border-t border-[#DDDDDD] hover:bg-[#F5FAFF]"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        {log.time instanceof Date
                          ? log.time.toLocaleString()
                          : "Unknown"}
                      </td>
                      <td className="px-4 py-2 font-semibold text-[#2785E3]">
                        {log.action}
                      </td>
                      <td className="px-4 py-2">{log.user}</td>
                      <td className="px-4 py-2">{log.quiz}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
