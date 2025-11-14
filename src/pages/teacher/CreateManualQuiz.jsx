// CreateManualQuiz.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import TeacherSidebar from "../../components/TeacherSidebar";
import { LogOut, User, Check, Search, ChevronDown } from "lucide-react";
import NotificationBell from "../../components/NotificationBell";

export default function CreateManualQuiz() {
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true"
  );
  const [questionBank, setQuestionBank] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [search, setSearch] = useState("");

  const auth = getAuth();
  const navigate = useNavigate();

  /* ───────── Fetch teacher’s question bank ───────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return navigate("/");

      const q = query(
        collection(db, "questionBank"),
        where("createdBy", "==", user.uid)
      );
      const snap = await getDocs(q);
      setQuestionBank(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    });

    return () => unsub();
  }, [auth, navigate]);

  const filteredQuestions = useMemo(() => {
    return questionBank.filter((q) =>
      q.questionText.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, questionBank]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!title || selectedIds.length === 0) {
      alert("Title and at least 1 question are required.");
      return;
    }

    const newQuiz = {
      title,
      difficulty,
      type: "manual",
      createdBy: user.uid,
      timestamp: serverTimestamp(),
      questionIds: selectedIds,
    };

    await addDoc(collection(db, "quizzes"), newQuiz);
    alert("Quiz created!");
    setTitle("");
    setDifficulty("easy");
    setSelectedIds([]);
  };

  const handleLogout = () => signOut(auth).then(() => navigate("/"));

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#E8F6FF] to-[#D9F0FF] text-[#333]">
      <TeacherSidebar
        minimized={sidebarMinimized}
        setMinimized={setSidebarMinimized}
      />

      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarMinimized ? "pl-[88px]" : "pl-[256px]"
        } pt-14 px-8 overflow-y-auto`}
      >
        {/* ───── Top App Bar ───── */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-[#3399FF] text-white flex justify-between items-center px-4 shadow z-10">
          <div className="text-lg font-bold tracking-wide">
            ⚡ QuizRush <span className="text-sm font-normal">| Create Quiz (Manual)</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              className="bg-white text-[#3399FF] border border-[#3399FF] px-3 py-1 rounded-md flex items-center gap-1 hover:bg-[#E6F2FF]"
              onClick={handleLogout}
            >
              <User className="w-4 h-4" />
              <span className="text-sm">Logout</span>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ───── Form ───── */}
        <div className="mt-4 max-w-3xl mx-auto bg-white p-6 rounded-md shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Create Manual Quiz</h2>

          <label className="block text-sm font-medium mb-1">Quiz Title</label>
          <input
            type="text"
            className="w-full border px-3 py-2 rounded mb-4 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Science Quiz – Earth & Space"
          />

          <label className="block text-sm font-medium mb-1">Difficulty</label>
          <select
            className="w-full border px-3 py-2 rounded mb-4 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <label className="block text-sm font-medium mb-1">Search Questions</label>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              className="w-full pl-8 pr-3 py-2 border rounded text-sm"
              placeholder="Search by text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <p className="text-sm font-medium mb-2">
            Select Questions ({selectedIds.length})
          </p>
          <div className="h-64 overflow-y-auto border rounded p-2 space-y-2">
            {filteredQuestions.length === 0 ? (
              <p className="text-sm text-gray-500">No matching questions.</p>
            ) : (
              filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className={`p-3 rounded border cursor-pointer text-sm ${
                    selectedIds.includes(q.id)
                      ? "bg-[#D3EAFE] border-blue-500"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => toggleSelect(q.id)}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{q.questionText}</p>
                    {selectedIds.includes(q.id) && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Difficulty: {q.difficulty} | Tags:{" "}
                    {q.tags?.join(", ") || "None"}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={handleSave}
            className="mt-6 w-full bg-[#3399FF] hover:bg-[#2785E3] text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Save Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
