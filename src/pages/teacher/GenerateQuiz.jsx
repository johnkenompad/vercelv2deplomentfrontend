/* --------------------------------------------------------------------------
   GenerateQuiz.jsx  –  modernized to match new dashboard design system
   • Adds the fixed top-navigation bar (purple App Bar)
   • Re-uses sidebar layout, colors, borders, badge style, etc.
   • Removes the old header icons for a cleaner look
----------------------------------------------------------------------------*/
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Sidebar from '../../components/Sidebar';
import { motion } from 'framer-motion';

export default function GenerateQuiz() {
  /* ──────────────────────────────────────────────────────────
     Local state
  ────────────────────────────────────────────────────────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem('sidebarMinimized') === 'true',
  );
  const [title, setTitle]           = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [quizType, setQuizType]     = useState([]);
  const [mcqCount, setMcqCount]     = useState('');
  const [tfCount, setTfCount]       = useState('');
  const [inputText, setInputText]   = useState('');
  const [file, setFile]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [quiz, setQuiz]             = useState([]);

  const navigate = useNavigate();

  /* ──────────────────────────────────────────────────────────
     Handlers
  ────────────────────────────────────────────────────────── */
  const handleCheckboxChange = (type) => {
    setQuizType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setOcrLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selected);

      const { data } = await axios.post('/api/extract-text', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setInputText(data.text || '');
    } catch (err) {
      console.error('OCR Error →', err);
      alert('Failed to extract text from the uploaded file.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleGenerateAndSave = async (e) => {
    e.preventDefault();
    if (!title || quizType.length === 0 || (!inputText && !file)) {
      alert('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      const { currentUser } = getAuth();
      const uid = currentUser?.uid || 'guest';

      /* Call backend to generate quiz */
      const { data } = await axios.post('/api/generate-quiz', {
        text         : inputText,
        quizType,
        mcQuestions  : mcqCount,
        tfQuestions  : tfCount,
        difficulty,
        created_by   : uid,
      });

      /* Assemble Firestore document */
      await addDoc(collection(db, 'quizzes'), {
        title,
        difficulty,
        quizType,
        mcQuestions  : Number(mcqCount),
        tfQuestions  : Number(tfCount),
        questions    : data.questions,
        sourceText   : inputText,
        createdAt    : serverTimestamp(),
        created_by   : uid,
        published    : false,
      });

      setQuiz(data.questions);
      alert('✅ Quiz generated and saved!');
    } catch (err) {
      console.error('Generation error →', err);
      alert('Failed to generate or save quiz.');
    } finally {
      setLoading(false);
    }
  };

  const multipleChoice = quiz.filter((q) => q.question_type === 'mc');
  const trueFalse     = quiz.filter((q) => q.question_type === 'tf');

  /* ──────────────────────────────────────────────────────────
     Render
  ────────────────────────────────────────────────────────── */
  return (
    <>
      {/* -------- Top Navigation Bar (App Bar) -------- */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between bg-[#B76EF1] px-6 text-white shadow">
        <span className="font-semibold">QuizRush • Teacher</span>
        <span className="text-sm opacity-90">Prof. QuizMaster</span>
      </div>

      {/* -------------- Page layout -------------- */}
      <div className="flex h-screen pt-14 bg-[#F6EFFC] text-[#5C517B]">
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={setSidebarMinimized}
        />

        {/* Main */}
        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? 'ml-20' : 'ml-64'
          }`}
        >
          {/* Page title */}
          <header className="px-10 pt-8 pb-4">
            <h1 className="text-2xl font-bold text-[#5C517B]">
              Create a New Quiz
            </h1>
          </header>

          {/* ---------- Form ---------- */}
          <form
            onSubmit={handleGenerateAndSave}
            className="mx-auto max-w-3xl rounded-xl border border-[#EBD3FA] bg-white p-6 shadow"
          >
            {/* Title */}
            <label className="block font-semibold">Quiz Title</label>
            <input
              type="text"
              className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
              placeholder="e.g., Basic Algebra Quiz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            {/* Difficulty */}
            <label className="mt-4 block font-semibold">Difficulty Level</label>
            <select
              className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>

            {/* Quiz type */}
            <label className="mt-4 block font-semibold">Quiz Type</label>
            <div className="mt-1 flex gap-6">
              {['mc', 'tf'].map((type) => (
                <label key={type} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={quizType.includes(type)}
                    onChange={() => handleCheckboxChange(type)}
                  />
                  {type === 'mc' ? 'Multiple Choice' : 'True / False'}
                </label>
              ))}
            </div>

            {/* Counts */}
            {quizType.includes('mc') && (
              <>
                <label className="mt-4 block font-semibold">
                  # of MCQ Questions
                </label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
                  value={mcqCount}
                  onChange={(e) => setMcqCount(e.target.value)}
                />
              </>
            )}

            {quizType.includes('tf') && (
              <>
                <label className="mt-4 block font-semibold">
                  # of True / False Questions
                </label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
                  value={tfCount}
                  onChange={(e) => setTfCount(e.target.value)}
                />
              </>
            )}

            {/* Source text */}
            <label className="mt-4 block font-semibold">
              Enter Quiz Source Text
            </label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded border border-[#D6BBF8] p-2"
              placeholder="Paste topic, paragraph, or notes here…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            <p className="mt-2 text-sm text-[#7B6E9C]">
              💡 Quiz will be auto-generated from the text or uploaded file.
            </p>

            {/* File upload */}
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-700">
                📁 Upload a File (Image / PDF / DOCX)
              </h2>
              <label
                htmlFor="quizFile"
                className="mt-2 flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 p-6 text-center transition hover:bg-purple-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mb-2 h-8 w-8 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-sm text-gray-600">
                  Click to upload or drag &amp; drop
                </span>
                <span className="mt-1 text-xs text-gray-500">
                  (Accepted: .jpg, .png, .pdf, .docx)
                </span>
                <input
                  id="quizFile"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <p className="mt-2 text-sm text-green-700">
                  📎 {file.name} uploaded
                </p>
              )}
              {ocrLoading && (
                <p className="mt-1 text-sm italic text-purple-600">
                  🔄 Extracting text from file…
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-6 rounded bg-[#B76EF1] px-6 py-3 text-white transition hover:bg-[#974EC3]"
              disabled={loading || ocrLoading}
            >
              {loading ? '⏳ Generating…' : '⚡ Generate & Save Quiz'}
            </button>
          </form>

          {/* ---------- Preview ---------- */}
          {quiz.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto mt-10 max-w-3xl rounded-lg border border-[#EBD3FA] bg-white p-6 shadow"
            >
              {multipleChoice.length > 0 && (
                <>
                  <motion.h3
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="mb-2 text-lg font-bold text-[#974EC3]"
                  >
                    📘 Multiple Choice Questions
                  </motion.h3>
                  <ul className="ml-5 list-disc">
                    {multipleChoice.map((q, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        className="mb-2"
                      >
                        <p className="font-medium">{q.question}</p>
                        <ul className="ml-4 list-[square] text-sm">
                          {q.options.map((opt, idx) => (
                            <li key={idx}>{opt}</li>
                          ))}
                        </ul>
                      </motion.li>
                    ))}
                  </ul>
                </>
              )}

              {trueFalse.length > 0 && (
                <>
                  <motion.h3
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="mt-6 mb-2 text-lg font-bold text-[#974EC3]"
                  >
                    📗 True / False Questions
                  </motion.h3>
                  <ul className="ml-5 list-disc text-sm">
                    {trueFalse.map((q, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + i * 0.05 }}
                        className="mb-2"
                      >
                        {q.question}
                      </motion.li>
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </>
  );
}
