/* --------------------------------------------------------------------------
   CustomizeQuiz.jsx  – styled to match GenerateQuiz + TeacherDashboard
   • Adds fixed top App Bar
   • Re-uses sidebar layout, colors, borders, badges, etc.
   • Removes extra header icons for a minimal, cohesive look
---------------------------------------------------------------------------*/
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import Sidebar from '../../components/Sidebar';
import { Loader2 } from 'lucide-react';

export default function CustomizeQuiz() {
  /* ────────────────────────────────────────
     ⚙️ Local state
  ──────────────────────────────────────── */
  const [quizzes, setQuizzes]       = useState([]);
  const [selectedQuiz, setSelected] = useState('');
  const [title, setTitle]           = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [mcqCount, setMcqCount]     = useState('');
  const [tfCount, setTfCount]       = useState('');
  const [quizType, setQuizType]     = useState('');
  const [quizSource, setSource]     = useState('');
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem('sidebarMinimized') === 'true',
  );
  const [saved, setSaved]           = useState(false);
  const [generated, setGenerated]   = useState([]);
  const [loading, setLoading]       = useState(false);

  const navigate = useNavigate();

  /* ────────────────────────────────────────
     📥 Fetch quizzes
  ──────────────────────────────────────── */
  const fetchQuizzes = async () => {
    const snap = await getDocs(collection(db, 'quizzes'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setQuizzes(list);
  };
  useEffect(() => {
    fetchQuizzes();
  }, []);

  /* ────────────────────────────────────────
     💾 Save customization
  ──────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuiz) return alert('Please select a quiz to customize.');

    setLoading(true);
    setSaved(false);
    setGenerated([]);
    try {
      const uid = getAuth().currentUser?.uid ?? 'guest';

      const { data } = await axios.post('/api/generate-custom-quiz', {
        title,
        difficulty,
        mcqCount,
        tfCount,
        quizSource,
        created_by: uid,
      });

      await updateDoc(doc(db, 'quizzes', selectedQuiz), {
        title,
        difficulty,
        mcQuestions : +mcqCount,
        tfQuestions : +tfCount,
        questions   : data.questions,
        sourceText  : quizSource,
        created_by  : uid,
      });

      setGenerated(data.questions);
      await fetchQuizzes();
      setSaved(true);
    } catch (err) {
      console.error('❌ Error:', err);
      alert('Failed to generate quiz – check your backend.');
    }
    setLoading(false);
  };

  /* ────────────────────────────────────────
     🗑️ Delete quiz
  ──────────────────────────────────────── */
  const handleDelete = async () => {
    if (!selectedQuiz) return alert('Select a quiz first.');
    if (!window.confirm('Delete this quiz and all related data?')) return;

    try {
      await deleteDoc(doc(db, 'quizzes', selectedQuiz));

      /* cascade delete assignedTo + user results */
      const assigned = await getDocs(
        collection(db, 'quizzes', selectedQuiz, 'assignedTo'),
      );
      for (const d of assigned.docs) {
        await deleteDoc(doc(db, 'quizzes', selectedQuiz, 'assignedTo', d.id));
      }
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const u of usersSnap.docs) {
        await deleteDoc(doc(db, 'users', u.id, 'results', selectedQuiz));
      }

      /* reset local state */
      setSelected('');
      setTitle('');
      setDifficulty('Easy');
      setMcqCount('');
      setTfCount('');
      setSource('');
      setQuizType('');
      setGenerated([]);
      setSaved(false);

      await fetchQuizzes();
      alert('✅ Quiz deleted.');
    } catch (err) {
      console.error(err);
      alert('❌ Delete failed.');
    }
  };

  /* ────────────────────────────────────────
     Helpers
  ──────────────────────────────────────── */
  const mcOnly = generated.filter((q) => q.question_type === 'mc');
  const tfOnly = generated.filter((q) => q.question_type === 'tf');

  const diffBadge = (diff) =>
    ({
      hard     : 'bg-[#D7F9D0] text-[#285C2A]',
      medium   : 'bg-[#D3EAFE] text-[#1D4F91]',
      draft    : 'bg-[#FFEFD5] text-[#996A00]',
      published: 'bg-[#CFFDF1] text-[#007654]',
    }[diff.toLowerCase()] ?? 'bg-[#D3EAFE] text-[#1D4F91]');

  /* ────────────────────────────────────────
     UI
  ──────────────────────────────────────── */
  return (
    <>
      {/* --------- Top Navigation Bar --------- */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between bg-[#B76EF1] px-6 text-white shadow">
        <span className="font-semibold">QuizRush • Teacher</span>
        <span className="text-sm opacity-90">Prof. QuizMaster</span>
      </div>

      {/* ------------- Layout ------------- */}
      <div className="flex h-screen pt-14 bg-[#F6EFFC] text-[#5C517B]">
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? 'ml-20' : 'ml-64'
          }`}
        >
          {/* Page header */}
          <header className="px-10 pt-8 pb-4">
            <h1 className="text-2xl font-bold">Customize Quiz</h1>
          </header>

          {/* ---------- Form card ---------- */}
          <form
            onSubmit={handleSubmit}
            className="mx-auto mb-10 max-w-3xl rounded-xl border border-[#EBD3FA] bg-white p-8 shadow"
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
                  setTitle(q.title ?? '');
                  setDifficulty(q.difficulty ?? 'Easy');
                  setMcqCount(q.mcQuestions ?? '');
                  setTfCount(q.tfQuestions ?? '');
                  setSource(q.sourceText ?? '');
                  const hasMC = q.mcQuestions > 0;
                  const hasTF = q.tfQuestions > 0;
                  setQuizType(
                    hasMC && hasTF
                      ? 'Multiple Choice · True/False'
                      : hasMC
                      ? 'Multiple Choice'
                      : hasTF
                      ? 'True/False'
                      : 'Unknown',
                  );
                }
              }}
              className="mt-1 w-full rounded border border-[#D6BBF8] bg-[#F6EFFC] p-2"
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
                  className="mt-1 w-full rounded border border-[#D6BBF8] bg-[#F6EFFC] p-2"
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
              className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
            />

            {/* Difficulty */}
            <label className="mt-4 block text-sm font-semibold">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>

            {/* Source text */}
            <label className="mt-4 block text-sm font-semibold">
              ✍️ Quiz Source Text
            </label>
            <textarea
              rows={6}
              value={quizSource}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Paste text used by the AI…"
              required
              className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
            />

            {/* Counts */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold">
                  # Multiple Choice
                </label>
                <input
                  type="number"
                  min="0"
                  value={mcqCount}
                  onChange={(e) => setMcqCount(e.target.value)}
                  className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold">
                  # True/False
                </label>
                <input
                  type="number"
                  min="0"
                  value={tfCount}
                  onChange={(e) => setTfCount(e.target.value)}
                  className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
                  required
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded bg-[#B76EF1] px-6 py-3 font-semibold text-white transition hover:bg-[#974EC3] sm:w-auto ${
                  loading && 'cursor-not-allowed opacity-60'
                }`}
              >
                💾 {loading ? 'Generating…' : 'Save Customization'}
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

          {/* ---------- Preview ---------- */}
          {generated.length > 0 && (
            <div className="mx-auto mb-12 max-w-3xl rounded-lg border border-[#EBD3FA] bg-white p-6 shadow">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-[#B76EF1]">
                📝 Preview
              </h2>

              {/* MCQ */}
              {mcOnly.length > 0 && (
                <>
                  <h3 className="mb-2 text-lg font-semibold">📘 Multiple Choice</h3>
                  <p className="mb-4 text-sm">Choose the correct answer.</p>
                  <div className="overflow-x-auto mb-8">
                    <table className="min-w-full text-left text-sm">
                      <tbody>
                        {mcOnly.map((q, i) => (
                          <tr
                            key={i}
                            className="odd:bg-white even:bg-[#FAF9FF] hover:bg-[#F6EFFC]"
                          >
                            <td className="w-1/12 px-4 py-3 font-medium">{i + 1}.</td>
                            <td className="w-7/12 px-4 py-3">{q.question}</td>
                            <td className="w-4/12 px-4 py-3">
                              <ul className="ml-5 list-disc">
                                {q.options.map((opt, idx) => (
                                  <li key={idx}>{opt}</li>
                                ))}
                              </ul>
                            </td>
                            <td className="w-2/12 px-4 py-3 text-green-600">{q.answer}</td>
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
                  <p className="mb-4 text-sm">
                    Decide if the statement is true or false.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <tbody>
                        {tfOnly.map((q, i) => (
                          <tr
                            key={i}
                            className="odd:bg-white even:bg-[#FAF9FF] hover:bg-[#F6EFFC]"
                          >
                            <td className="w-1/12 px-4 py-3 font-medium">{i + 1}.</td>
                            <td className="w-9/12 px-4 py-3">{q.question}</td>
                            <td className="w-2/12 px-4 py-3 text-green-600">{q.answer}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Loading overlay (optional) */}
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
