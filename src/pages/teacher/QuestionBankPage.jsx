// src/pages/teacher/QuestionBankPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import TeacherSidebar from "../../components/TeacherSidebar";
import {
  LogOut,
  User,
  Plus,
  X,
  Pencil,
  Trash,
  Search,
  Filter,
} from "lucide-react";
import NotificationBell from "../../components/NotificationBell";

export default function QuestionBankPage() {
  /* ───────── Sidebar & Auth ───────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true"
  );
  const auth = getAuth();
  const navigate = useNavigate();

  /* ───────── Data ───────── */
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ───────── Modal ───────── */
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const blankForm = {
    questionText: "",
    choices: ["", "", "", ""],
    correctAnswer: "",
    difficulty: "easy",
    questionType: "mcq",
    tags: "",
  };
  const [formData, setFormData] = useState(blankForm);

  /* ───────── Filters ───────── */
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");

  /* ───────── Fetch teacher’s questions ───────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return navigate("/");

      const q = query(
        collection(db, "questionBank"),
        where("createdBy", "==", user.uid)
      );
      const snap = await getDocs(q);
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [auth, navigate]);

  /* ───────── Derived filtered list ───────── */
  const displayedQuestions = useMemo(() => {
    return questions.filter((q) => {
      const textMatch = q.questionText
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const diffMatch =
        difficultyFilter === "all" || q.difficulty === difficultyFilter;
      const tagMatch =
        tagFilter.trim() === "" ||
        (q.tags &&
          q.tags.some((t) =>
            t.toLowerCase().includes(tagFilter.toLowerCase().trim())
          ));
      return textMatch && diffMatch && tagMatch;
    });
  }, [questions, searchTerm, difficultyFilter, tagFilter]);

  /* ───────── CRUD helpers ───────── */
  const updateChoice = (i, v) => {
    const c = [...formData.choices];
    c[i] = v;
    setFormData({ ...formData, choices: c });
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const data = {
      ...formData,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      createdBy: user.uid,
      timestamp: serverTimestamp(),
    };
    if (editId) await updateDoc(doc(db, "questionBank", editId), data);
    else await addDoc(collection(db, "questionBank"), data);
    window.location.reload();
  };

  const handleEdit = (q) => {
    setFormData({
      questionText: q.questionText,
      choices: q.choices,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty,
      questionType: q.questionType || "mcq",
      tags: q.tags?.join(", ") || "",
    });
    setEditId(q.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this question?"))
      await deleteDoc(doc(db, "questionBank", id)).then(() =>
        setQuestions(questions.filter((q) => q.id !== id))
      );
  };

  const handleLogout = () => signOut(auth).then(() => navigate("/"));

  /* ───────── UI ───────── */
  return (
    <div className="flex h-screen bg-gradient-to-br from-[#E8F6FF] to-[#D9F0FF] text-[#333]">
      <TeacherSidebar
        minimized={sidebarMinimized}
        setMinimized={setSidebarMinimized}
      />

      <div
        className={`flex-1 transition-all ${
          sidebarMinimized ? "pl-[88px]" : "pl-[256px]"
        } pt-14 px-8 overflow-y-auto`}
      >
        {/* Top Bar */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-[#3399FF] text-white flex justify-between items-center px-4 shadow z-10">
          <div className="text-lg font-bold">⚡ QuizRush | Question Bank</div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="bg-white text-[#3399FF] border border-[#3399FF] px-3 py-1 rounded flex items-center gap-1 text-sm hover:bg-[#E6F2FF]"
            >
              <User className="w-4 h-4" />
              Logout
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Header + Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold">My Question Bank</h1>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-2 top-3" />
              <input
                className="pl-8 pr-3 py-2 border rounded text-sm"
                placeholder="Search question text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="border rounded text-sm px-3 py-2"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="all">All Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <input
              className="border rounded text-sm px-3 py-2"
              placeholder="Filter by tag..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            />
          </div>

          {/* New Question */}
          <button
            onClick={() => {
              setShowModal(true);
              setEditId(null);
              setFormData(blankForm);
            }}
            className="flex items-center gap-1 bg-[#3399FF] hover:bg-[#2785E3] text-white px-4 py-2 rounded-md text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Question
          </button>
        </div>

        {/* Question List */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : displayedQuestions.length === 0 ? (
          <p className="text-sm text-gray-500">No questions match filters.</p>
        ) : (
          <div className="grid gap-4">
            {displayedQuestions.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-md shadow-sm p-4 border border-gray-200"
              >
                <p className="font-medium text-[#1D4F91]">{q.questionText}</p>
                <ul className="list-disc list-inside text-sm mt-2">
                  {q.choices.map((c, i) => (
                    <li
                      key={i}
                      className={
                        c.includes(q.correctAnswer)
                          ? "font-semibold text-green-700"
                          : ""
                      }
                    >
                      {c}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-4 text-xs text-gray-500 mt-2">
                  <span>Difficulty: {q.difficulty}</span>
                  {q.tags && <span>Tags: {q.tags.join(", ")}</span>}
                </div>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => handleEdit(q)}
                    className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="text-red-600 text-sm flex items-center gap-1 hover:underline"
                  >
                    <Trash className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[480px] rounded-md p-6 shadow relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              {editId ? "Edit Question" : "Add New Question"}
            </h2>

            {/* Form */}
            <input
              type="text"
              placeholder="Question text"
              className="w-full border px-3 py-2 mb-3 rounded text-sm"
              value={formData.questionText}
              onChange={(e) =>
                setFormData({ ...formData, questionText: e.target.value })
              }
            />
            {formData.choices.map((c, i) => (
              <input
                key={i}
                type="text"
                className="w-full border px-3 py-2 mb-2 rounded text-sm"
                placeholder={`Choice ${i + 1}`}
                value={c}
                onChange={(e) => updateChoice(i, e.target.value)}
              />
            ))}
            <input
              type="text"
              placeholder="Correct Answer (e.g., C)"
              className="w-full border px-3 py-2 mb-2 rounded text-sm"
              value={formData.correctAnswer}
              onChange={(e) =>
                setFormData({ ...formData, correctAnswer: e.target.value })
              }
            />
            <select
              className="w-full border px-3 py-2 mb-2 rounded text-sm"
              value={formData.difficulty}
              onChange={(e) =>
                setFormData({ ...formData, difficulty: e.target.value })
              }
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <input
              type="text"
              placeholder="Tags (comma separated)"
              className="w-full border px-3 py-2 mb-4 rounded text-sm"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
            />

            <button
              onClick={handleSave}
              className="w-full bg-[#3399FF] hover:bg-[#2785E3] text-white py-2 rounded-md text-sm font-medium"
            >
              {editId ? "Update Question" : "Save Question"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
