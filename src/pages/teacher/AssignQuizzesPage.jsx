/* --------------------------------------------------------------------------
   AssignQuizPage.jsx  – styled to match GenerateQuiz & TeacherDashboard
   • Adds the fixed purple App Bar
   • Uses the same sidebar + bg + card + button styles
   • Removes extra header icon placeholders for a clean, cohesive look
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getAuth } from 'firebase/auth';
import Sidebar from '../../components/Sidebar';

export default function AssignQuizPage() {
  /* ──────────────────────────────────────────────────────────
     Local state
  ────────────────────────────────────────────────────────── */
  const [quizzes, setQuizzes]           = useState([]);
  const [students, setStudents]         = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [selectedStudents, setSelStuds] = useState([]);
  const [deadline, setDeadline]         = useState('');
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem('sidebarMinimized') === 'true',
  );

  const navigate = useNavigate();

  /* ──────────────────────────────────────────────────────────
     Fetch quizzes & students
  ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const fetchData = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      const quizQ  = query(collection(db, 'quizzes'), where('created_by', '==', user.uid));
      const studQ  = query(collection(db, 'users'), where('role', '==', 'student'));
      const [quizSnap, studSnap] = await Promise.all([getDocs(quizQ), getDocs(studQ)]);

      setQuizzes(quizSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStudents(studSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchData();
  }, []);

  /* Persist sidebar state */
  useEffect(() => {
    localStorage.setItem('sidebarMinimized', sidebarMinimized);
  }, [sidebarMinimized]);

  /* ──────────────────────────────────────────────────────────
     Handlers
  ────────────────────────────────────────────────────────── */
  const toggleAll = (e) => {
    setSelStuds(e.target.checked ? students.map((s) => s.id) : []);
  };
  const toggleStudent = (id) => {
    setSelStuds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedQuiz || !deadline || selectedStudents.length === 0)
      return alert('❗ Select a quiz, students, and deadline.');

    try {
      await Promise.all(
        selectedStudents.map((sid) =>
          setDoc(doc(db, `quizzes/${selectedQuiz}/assignedTo/${sid}`), {
            assignedAt: serverTimestamp(),
            studentId : sid,
            deadline,
          }),
        ),
      );
      alert('✅ Quiz assigned!');
      setSelStuds([]);
      setSelectedQuiz('');
      setDeadline('');
    } catch (err) {
      console.error(err);
      alert('❌ Assignment failed.');
    }
  };

  /* ──────────────────────────────────────────────────────────
     UI
  ────────────────────────────────────────────────────────── */
  return (
    <>
      {/* -------- Top Navigation Bar -------- */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between bg-[#B76EF1] px-6 text-white shadow">
        <span className="font-semibold">QuizRush • Teacher</span>
        <span className="text-sm opacity-90">Prof. QuizMaster</span>
      </div>

      {/* -------- Page layout -------- */}
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
            <h1 className="text-2xl font-bold">Assign Quiz to Students</h1>
          </header>

          {/* ------------ Form card ------------ */}
          <form
            onSubmit={handleAssign}
            className="mx-auto max-w-3xl rounded-xl border border-[#EBD3FA] bg-white p-8 shadow"
          >
            {/* Quiz selector */}
            <label className="block text-sm font-semibold">
              Select Quiz
            </label>
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              className="mt-1 w-full rounded border border-[#D6BBF8] p-2 bg-[#F6EFFC]"
            >
              <option value="">— Choose a quiz —</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>

            {/* Students */}
            <label className="mt-4 block text-sm font-semibold">
              Select Students
            </label>
            <div className="mt-1 max-h-40 overflow-y-auto rounded border border-[#EBD3FA] bg-gray-50 p-3">
              <label className="mb-2 block">
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={selectedStudents.length === students.length && students.length > 0}
                  className="mr-2"
                />
                Select All
              </label>
              {students.map((s) => (
                <label key={s.id} className="block">
                  <input
                    type="checkbox"
                    value={s.id}
                    checked={selectedStudents.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="mr-2"
                  />
                  {s.displayName || s.email}
                </label>
              ))}
            </div>

            {/* Deadline */}
            <label className="mt-4 block text-sm font-semibold">
              Set Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
            />

            {/* Submit */}
            <button
              type="submit"
              className="mt-6 rounded bg-[#B76EF1] px-6 py-3 font-semibold text-white transition hover:bg-[#974EC3]"
            >
              ✅ Confirm Assignment
            </button>

            <p className="mt-3 text-sm text-[#5C517B]/70">
              🎉 Students will receive a notification once assigned.
            </p>
          </form>
        </main>
      </div>
    </>
  );
}
