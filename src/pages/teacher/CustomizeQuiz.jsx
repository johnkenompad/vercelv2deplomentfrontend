/* --------------------------------------------------------------------------  
   CustomizeQuiz.jsx – vivid-blue Teacher UI (now uses TeacherTopNavBar)  
   • Adds BT2, BT5, BT6 columns (BT1-BT6)  
   • Keeps ALL original functionality (preview, diffBadge, etc.)  
---------------------------------------------------------------------------*/
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import axios from "../../axiosConfig";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "react-toastify";

import Sidebar from "../../components/Sidebar";
import TeacherTopNavBar from "../../components/TeacherTopNavBar";

import { Loader2, Plus, Trash2 } from "lucide-react";

export default function CustomizeQuiz() {
  /* ─────────────────────────────── State */
  const [quizzes, setQuizzes]       = useState([]);
  const [selectedQuiz, setSelected] = useState("");
  const [title, setTitle]           = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [mcqCount, setMcqCount]     = useState("");
  const [tfCount, setTfCount]       = useState("");
  const [quizType, setQuizType]     = useState("");
  const [quizSource, setSource]     = useState("");
  const [visibleToStudents, setVisibleToStudents] = useState(true);
  const [sidebarMinimized, setSidebarMinimized]   = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [saved, setSaved]           = useState(false);
  const [generated, setGenerated]   = useState([]);
  const [loading, setLoading]       = useState(false);

  /* ── TOS rows with full Bloom (BT1-BT6) */
  const newArea = () => ({
    topic: "",
    bt1: 0,
    bt2: 0,
    bt3: 0,
    bt4: 0,
    bt5: 0,
    bt6: 0,
  });
  const [contentAreas, setContentAreas] = useState([
    { topic: "Selection Structures", bt1: 0, bt2: 0, bt3: 0, bt4: 0, bt5: 0, bt6: 0 },
  ]);

  const navigate = useNavigate();
  const auth     = getAuth();
  const [currentUser, setCurrentUser] = useState(null);

  /* ─────────────────────────────── Auth guard */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        navigate("/login");
      } else {
        setCurrentUser(u);
      }
    });
    return () => unsub();
  }, [auth, navigate]);

  /* ─────────────────────────────── Fetch quizzes */
  const fetchQuizzes = async () => {
    if (!currentUser) return;
    
    const snap = await getDocs(collection(db, "quizzes"));
    // Filter to only show quizzes created by the current teacher
    const userQuizzes = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((q) => q.created_by === currentUser.uid);
    setQuizzes(userQuizzes);
  };
  
  useEffect(() => {
    if (currentUser) {
      fetchQuizzes();
    }
  }, [currentUser]);

  /* ─────────────────────────────── Helpers */
  const mcOnly = generated.filter((q) => q.question_type === "mc");
  const tfOnly = generated.filter((q) => q.question_type === "tf");

  const diffBadge = (d) =>
    ({
      hard: "bg-[#D7F9D0] text-[#285C2A]",
      medium: "bg-[#D3EAFE] text-[#1D4F91]",
      draft: "bg-[#FFEFD5] text-[#996A00]",
      published: "bg-[#CFFDF1] text-[#007654]",
    }[d.toLowerCase()] ?? "bg-[#D3EAFE] text-[#1D4F91]");

  const totalItemsPerArea = (r) =>
    r.bt1 + r.bt2 + r.bt3 + r.bt4 + r.bt5 + r.bt6;
  const overallTotal = contentAreas.reduce(
    (s, r) => s + totalItemsPerArea(r),
    0,
  );

  /* ── TOS row handlers */
  const handleAreaChange = (i, f, v) => {
    const clone  = [...contentAreas];
    clone[i]     = { ...clone[i], [f]: f === "topic" ? v : Number(v) || 0 };
    setContentAreas(clone);
  };
  const addArea    = () => setContentAreas([...contentAreas, newArea()]);
  const removeArea = (i) =>
    contentAreas.length > 1 &&
    setContentAreas(contentAreas.filter((_, idx) => idx !== i));

  /* ─────────────────────────────── Save customization */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuiz) {
      toast.warning("Please select a quiz to customize.");
      return;
    }
    if (!currentUser) {
      toast.error("User not authenticated.");
      return;
    }

    const rawTotal = Number(mcqCount || 0) + Number(tfCount || 0);
    if (rawTotal <= 0 && overallTotal <= 0) {
      toast.warning("Set MCQ/TF counts or allocate Bloom items in the TOS (must be > 0).");
      return;
    }

    setLoading(true);
    setSaved(false);
    setGenerated([]);
    try {
      const uid = currentUser.uid;

      console.log("Sending customize quiz request:", {
        title,
        difficulty,
        mcqCount,
        tfCount,
        contentAreas,
        created_by: uid,
      });

      const { data } = await axios.post("/api/generate-custom-quiz", {
        title,
        difficulty,
        mcqCount,
        tfCount,
        contentAreas,
        quizSource,
        created_by: uid,
      });

      console.log("Quiz generation response:", data);

      await updateDoc(doc(db, "quizzes", selectedQuiz), {
        title,
        difficulty,
        mcQuestions: +mcqCount,
        tfQuestions: +tfCount,
        contentAreas,
        questions: data.questions,
        sourceText: quizSource,
        visibleToStudents,
        created_by: uid,
      });

      setGenerated(data.questions);
      await fetchQuizzes();
      setSaved(true);
      toast.success("Quiz customization saved successfully!");
    } catch (err) {
      console.error("Customize quiz error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          baseURL: err.config?.baseURL,
        }
      });
      
      let errorMessage = "Failed to generate quiz.";
      if (err.response) {
        errorMessage = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = "Cannot reach the server. Please check your backend connection.";
      } else {
        errorMessage = err.message || "An unexpected error occurred.";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────── Delete quiz */
  const handleDelete = async () => {
    if (!selectedQuiz) {
      toast.warning("Select a quiz first.");
      return;
    }
    if (!window.confirm("Delete this quiz and all related data?")) return;
    try {
      await deleteDoc(doc(db, "quizzes", selectedQuiz));
      setSelected("");
      setTitle("");
      setDifficulty("Easy");
      setMcqCount("");
      setTfCount("");
      setQuizType("");
      setSource("");
      setVisibleToStudents(true);
      setContentAreas([newArea()]);
      setGenerated([]);
      setSaved(false);
      await fetchQuizzes();
      toast.success("Quiz deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete quiz.");
    }
  };

  /* ─────────────────────────────── UI */
  return (
    <>
      {/* Global Top Navbar */}
      <TeacherTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={() => navigate("/profile")}
        onLogoutClick={() => signOut(auth).then(() => navigate("/"))}
      />

      {/* Layout */}
      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={(val) => {
            localStorage.setItem("sidebarMinimized", val);
            setSidebarMinimized(val);
          }}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          <header className="px-10 pt-8 pb-4">
            <h1 className="text-2xl font-bold text-[#3A3A3A]">
              Customize Quiz
            </h1>
          </header>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mx-auto mb-10 max-w-5xl rounded-xl border border-[#DDDDDD] bg-white p-8 shadow"
          >
            {/* Quiz selector */}
            <label className="block text-sm font-semibold">Existing Quizzes</label>
            <select
              value={selectedQuiz}
              onChange={(e) => {
                const id = e.target.value;
                setSelected(id);
                const q = quizzes.find((z) => z.id === id);
                if (q) {
                  setTitle(q.title ?? "");
                  setDifficulty(q.difficulty ?? "Easy");
                  setMcqCount(q.mcQuestions ?? "");
                  setTfCount(q.tfQuestions ?? "");
                  setSource(q.sourceText ?? "");
                  setVisibleToStudents(
                    q.visibleToStudents === undefined ? true : q.visibleToStudents,
                  );
                  setQuizType(
                    q.mcQuestions > 0 && q.tfQuestions > 0
                      ? "Multiple Choice · True/False"
                      : q.mcQuestions > 0
                      ? "Multiple Choice"
                      : q.tfQuestions > 0
                      ? "True/False"
                      : "Unknown",
                  );
                  setContentAreas(
                    q.contentAreas?.length
                      ? q.contentAreas
                      : [newArea()],
                  );
                }
              }}
              className="mt-1 w-full rounded border border-[#DDDDDD] bg-[#E8F6FF] p-2"
            >
              <option value="">Select a quiz…</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title || q.id}
                </option>
              ))}
            </select>

            {/* Current info */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold">
                  📋 Current Quiz Type
                </label>
                <input
                  readOnly
                  value={quizType}
                  className="mt-1 w-full rounded border border-[#DDDDDD] bg-[#E8F6FF] p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold">
                  Difficulty Badge
                </label>
                <span
                  className={`mt-1 inline-block w-full rounded p-2 text-center text-sm font-medium ${diffBadge(
                    difficulty,
                  )}`}
                >
                  {difficulty}
                </span>
              </div>
            </div>

            {/* Title */}
            <label className="mt-4 block text-sm font-semibold">Quiz Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Computer Fundamentals"
              required
              className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
            />

            {/* Difficulty */}
            <label className="mt-4 block text-sm font-semibold">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>

            {/* Source text */}
            <label className="mt-4 block text-sm font-semibold">✍️ Quiz Source Text</label>
            <textarea
              rows={4}
              value={quizSource}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Paste text used by the AI…"
              required
              className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
            />

            {/* MCQ / TF Counts */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold"># Multiple Choice</label>
                <input
                  type="number"
                  min="0"
                  value={mcqCount}
                  onChange={(e) => setMcqCount(e.target.value)}
                  className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold"># True/False</label>
                <input
                  type="number"
                  min="0"
                  value={tfCount}
                  onChange={(e) => setTfCount(e.target.value)}
                  className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
                />
              </div>
            </div>

            {/* Visibility toggle */}
            <div className="mt-4 flex items-center gap-2">
              <input
                id="visibleToggle"
                type="checkbox"
                className="h-4 w-4 accent-[#3399FF]"
                checked={visibleToStudents}
                onChange={(e) => setVisibleToStudents(e.target.checked)}
              />
              <label htmlFor="visibleToggle" className="text-sm font-semibold">
                Show Results to Students
              </label>
            </div>

            {/* TOS */}
            <h2 className="mt-8 text-lg font-bold text-[#3399FF]">
              📊 Table of Specifications
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[#F3F8FC] text-[#333333]">
                    <th className="px-3 py-2 text-left">Content Area</th>
                    {[
                      ["bt1", "BT1\nRemember"],
                      ["bt2", "BT2\nUnderstand"],
                      ["bt3", "BT3\nApply"],
                      ["bt4", "BT4\nAnalyze"],
                      ["bt5", "BT5\nEvaluate"],
                      ["bt6", "BT6\nCreate"],
                    ].map(([k, lbl]) => (
                      <th key={k} className="whitespace-pre px-3 py-2 text-center">
                        {lbl}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {contentAreas.map((row, idx) => (
                    <tr
                      key={idx}
                      className="odd:bg-white even:bg-[#F9FCFF] hover:bg-[#EDF4FF]"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          className="w-full rounded border border-[#DDDDDD] p-1"
                          value={row.topic}
                          onChange={(e) => handleAreaChange(idx, "topic", e.target.value)}
                          required
                        />
                      </td>
                      {["bt1", "bt2", "bt3", "bt4", "bt5", "bt6"].map((f) => (
                        <td key={f} className="px-2 py-1 text-center">
                          <input
                            type="number"
                            min="0"
                            className="w-20 rounded border border-[#DDDDDD] p-1 text-center"
                            value={row[f]}
                            onChange={(e) => handleAreaChange(idx, f, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-semibold">
                        {totalItemsPerArea(row)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeArea(idx)}
                          className="rounded p-1 text-[#DC2626] hover:bg-[#FEE2E2]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addArea}
              className="mt-3 inline-flex items-center gap-2 rounded bg-[#3399FF] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#2785E3]"
            >
              <Plus size={14} /> Add Content Area
            </button>

            <p className="mt-4 text-sm">
              <span className="font-semibold">Overall Total:</span> {overallTotal} items
            </p>

            {/* Buttons */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded bg-[#3399FF] px-6 py-3 font-semibold text-white transition hover:bg-[#2785E3] sm:w-auto ${
                  loading && "cursor-not-allowed opacity-60"
                }`}
              >
                💾 {loading ? "Generating…" : "Save & Generate"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!selectedQuiz}
                className="w-full rounded bg-[#DC2626] px-6 py-3 font-semibold text-white transition hover:bg-[#B91C1C] disabled:opacity-40 sm:w-auto"
              >
                🗑️ Delete Quiz
              </button>
            </div>

            {saved && (
              <p className="mt-3 font-semibold text-green-600">
                ✅ Quiz customization saved!
              </p>
            )}
          </form>

          {/* Preview */}
          {generated.length > 0 && (
            <div className="mx-auto mb-12 max-w-5xl rounded-lg border border-[#DDDDDD] bg-white p-6 shadow">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#3399FF]">
                📝 Preview
              </h2>

              {/* MCQ */}
              {mcOnly.length > 0 && (
                <>
                  <h3 className="mb-2 text-lg font-semibold">📘 Multiple Choice</h3>
                  <p className="mb-4 text-sm">Choose the correct answer.</p>
                  <div className="mb-8 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <tbody>
                        {mcOnly.map((q, i) => (
                          <tr
                            key={i}
                            className="odd:bg-white even:bg-[#F9FCFF] hover:bg-[#EDF4FF]"
                          >
                            <td className="w-1/12 px-4 py-3 font-medium">{i + 1}.</td>
                            <td className="w-7/12 px-4 py-3">{q.question}</td>
                            <td className="w-4/12 px-4 py-3">
                              <ul className="ml-5 list-disc">
                                {q.options.map((opt, idx) => (
                                  <li key={idx}>{opt}</li>
                                ))}
                              </ul>
                              <span className="mt-1 inline-block rounded bg-[#E8F6FF] px-2 py-0.5 text-xs font-semibold text-[#3399FF]">
                                {q.bloom_level}
                              </span>
                            </td>
                            <td className="hidden sm:table-cell w-2/12 px-4 py-3 text-green-600">
                              {q.answer}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* True / False */}
              {tfOnly.length > 0 && (
                <>
                  <h3 className="mb-2 text-lg font-semibold">📗 True / False</h3>
                  <p className="mb-4 text-sm">Decide if the statement is true or false.</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <tbody>
                        {tfOnly.map((q, i) => (
                          <tr
                            key={i}
                            className="odd:bg-white even:bg-[#F9FCFF] hover:bg-[#EDF4FF]"
                          >
                            <td className="w-1/12 px-4 py-3 font-medium">{i + 1}.</td>
                            <td className="w-9/12 px-4 py-3">{q.question}</td>
                            <td className="hidden sm:table-cell w-2/12 px-4 py-3 text-green-600">
                              {q.answer}
                            </td>
                            <td className="sm:hidden px-4 py-3">
                              <span className="rounded bg-[#E8F6FF] px-2 py-0.5 text-xs font-semibold text-[#3399FF]">
                                {q.bloom_level}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <Loader2 className="animate-spin text-white" size={40} />
            </div>
          )}
        </main>
      </div>
    </>
  );
}
