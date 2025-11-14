/* -------------------------------------------------------------------------- 
   PracticeQuiz.jsx – Student Practice Quiz Page (UPDATED to use StudentTopNavBar)
   • Integrates shared StudentTopNavBar for consistent UI
   • Keeps vivid-blue design system + existing logic
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

import StudentSidebar from "../../components/StudentSidebar";
import StudentTopNavBar from "../../components/StudentTopNavBar";

import { motion } from "framer-motion";

export default function PracticeQuiz() {
  /* ─────────────────────────────── State */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );

  /* quiz config */
  const [topic, setTopic] = useState("");
  const [quizType, setQuizType] = useState([]);
  const [mcqCount, setMcqCount] = useState("");
  const [tfCount, setTfCount] = useState("");
  const [difficulty, setDifficulty] = useState("Mix");

  /* source text / file */
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState(null);

  /* status */
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [quiz, setQuiz] = useState([]);

  /* practice flow */
  const [stage, setStage] = useState("config"); // config | preview | take | result
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);

  /* auth */
  const auth = getAuth();
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("Student");

  /* ─────────────────────────────── Auth listener */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setStudentName(u.displayName || u.email?.split("@")[0] || "Student");
    });
    return () => unsub();
  }, [auth]);

  /* ─────────────────────────────── Helpers */
  const handleSidebarToggle = (val) => {
    localStorage.setItem("sidebarMinimized", val);
    setSidebarMinimized(val);
  };

  const handleCheckboxChange = (type) =>
    setQuizType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      const { data } = await axios.post("/api/extract-text", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setInputText(data.text || "");
      setFile(null); // Clear file after OCR extraction
    } catch {
      alert("Failed to extract text from file.");
    } finally {
      setOcrLoading(false);
    }
  };

  const generateQuiz = async (e) => {
    e.preventDefault();
    if (!topic.trim() || quizType.length === 0 || !inputText.trim()) {
      alert("Fill Topic, Quiz Type, and Source Text.");
      return;
    }
    if (quizType.includes("mc") && !mcqCount) {
      alert("Specify # of MCQs.");
      return;
    }
    if (quizType.includes("tf") && !tfCount) {
      alert("Specify # of T/F.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post("/api/generate-quiz", {
        text: inputText,
        quizType,
        mcQuestions: Number(mcqCount) || 0,
        tfQuestions: Number(tfCount) || 0,
        difficulty,
        topic,
      });
      const cleanedQuestions = Array.isArray(data?.questions)
        ? data.questions.filter((q) => q && q.question)
        : [];
      if (!cleanedQuestions.length) {
        alert("No questions received from the generator.");
        return;
      }
      setQuiz(cleanedQuestions);
      setStage("preview");
    } catch {
      alert("Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const startPractice = () => {
    if (!quiz.length) {
      alert("Quiz data is empty.");
      return;
    }
    setStage("take");
    setCurrentIdx(0);
    setAnswers({});
    setScore(0);
  };

  const handleSelect = (val) => {
    setAnswers({ ...answers, [currentIdx]: val });
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  const handleNext = () => {
    if (currentIdx + 1 < quiz.length) setCurrentIdx((i) => i + 1);
  };

  const handleSubmit = () => {
    let sc = 0;
    quiz.forEach((q, idx) => {
      if (!q) return;
      const ans = answers[idx];
      const correctAns = q.answer;
      
      // Normalize both answers for comparison (trim and case-insensitive)
      const normalizedUserAnswer = (ans || "").toString().trim().toLowerCase();
      const normalizedCorrectAnswer = (correctAns || "").toString().trim().toLowerCase();
      
      if (normalizedUserAnswer === normalizedCorrectAnswer) {
        sc += 1;
      }
    });
    setScore(sc);
    setStage("result");
  };

  const allAnswered =
    quiz.length > 0 && Object.keys(answers).length === quiz.length;

  /* ─────────────────────────────── UI */
  return (
    <>
      {/* Global student top-navbar */}
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={handleSidebarToggle}
        onProfileClick={() => navigate("/profile")}
        onLogoutClick={() => signOut(auth).then(() => navigate("/"))}
      />

      {/* -------- Layout -------- */}
      <div
        className={`flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]`}
      >
        <StudentSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={handleSidebarToggle}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          {/* ---------- CONFIG FORM ---------- */}
          {stage === "config" && (
            <>
              <header className="px-10 pt-8 pb-4">
                <h1 className="text-2xl font-bold text-[#3A3A3A]">
                  Practice Quiz Generator
                </h1>
              </header>
              <form
                onSubmit={generateQuiz}
                className="mx-auto max-w-2xl rounded-xl border border-[#DDDDDD] bg-white p-6 shadow"
              >
                {/* Topic */}
                <label className="block font-semibold">Topic</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
                  placeholder="e.g., Java Inheritance"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                />

                {/* Quiz type */}
                <label className="mt-4 block font-semibold">Quiz Type</label>
                <div className="mt-1 flex gap-6">
                  {["mc", "tf"].map((type) => (
                    <label key={type} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2 accent-[#3399FF]"
                        checked={quizType.includes(type)}
                        onChange={() => handleCheckboxChange(type)}
                      />
                      {type === "mc" ? "Multiple Choice" : "True / False"}
                    </label>
                  ))}
                </div>

                {/* Counts */}
                {quizType.includes("mc") && (
                  <>
                    <label className="mt-4 block font-semibold">
                      # of MCQ Questions
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
                      value={mcqCount}
                      onChange={(e) => setMcqCount(e.target.value)}
                      required
                    />
                  </>
                )}
                {quizType.includes("tf") && (
                  <>
                    <label className="mt-4 block font-semibold">
                      # of True / False Questions
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
                      value={tfCount}
                      onChange={(e) => setTfCount(e.target.value)}
                      required
                    />
                  </>
                )}

                {/* Difficulty */}
                <label className="mt-4 block font-semibold">Difficulty</label>
                <div className="mt-1 flex flex-wrap gap-6">
                  {["Easy", "Average", "Difficult", "Mix"].map((lvl) => (
                    <label key={lvl} className="inline-flex items-center">
                      <input
                        type="radio"
                        name="difficulty"
                        className="mr-2 accent-[#3399FF]"
                        value={lvl}
                        checked={difficulty === lvl}
                        onChange={() => setDifficulty(lvl)}
                      />
                      {lvl}
                    </label>
                  ))}
                </div>

                {/* Source text */}
                <label className="mt-4 block font-semibold">
                  Enter Source Text
                </label>
                <textarea
                  rows={4}
                  className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
                  placeholder="Paste paragraph or notes here…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />

                {/* File upload */}
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-[#333333]">
                    📁 Upload a File (Image / PDF / DOCX)
                  </h2>
                  <label
                    htmlFor="sourceFile"
                    className="mt-2 flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#3399FF] bg-[#E8F6FF] p-6 text-center transition hover:bg-[#D9F0FF]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mb-2 h-8 w-8 text-[#3399FF]"
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
                    <span className="text-sm text-[#333333]">
                      Click to upload or drag &amp; drop
                    </span>
                    <span className="mt-1 text-xs text-[#666666]">
                      (Accepted: .jpg, .png, .pdf, .docx)
                    </span>
                    <input
                      id="sourceFile"
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
                    <p className="mt-1 text-sm italic text-[#3399FF]">
                      🔄 Extracting text…
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="mt-6 rounded bg-[#3399FF] px-6 py-3 text-white transition hover:bg-[#2785E3]"
                  disabled={loading || ocrLoading}
                >
                  {loading ? "⏳ Generating…" : "⚡ Generate Quiz"}
                </button>
              </form>
            </>
          )}

          {/* ---------- PREVIEW ---------- */}
          {stage === "preview" && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-10 max-w-3xl rounded-lg border border-[#DDDDDD] bg-white p-6 shadow"
            >
              <h2 className="mb-4 text-xl font-bold text-[#3A3A3A]">
                Quiz Preview
              </h2>
              <ul className="ml-5 list-disc">
                {quiz.map(
                  (q, i) =>
                    q && (
                      <li key={i} className="mb-2">
                        {q.question}
                      </li>
                    ),
                )}
              </ul>
              <button
                onClick={startPractice}
                className="mt-6 rounded bg-[#3399FF] px-6 py-3 text-white transition hover:bg-[#2785E3]"
              >
                🚀 Start Practice
              </button>
            </motion.div>
          )}

          {/* ---------- TAKE QUIZ ---------- */}
          {stage === "take" && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-10 max-w-2xl rounded-lg border border-[#DDDDDD] bg-white p-6 shadow"
            >
              {!quiz.length || !quiz[currentIdx] ? (
                <p className="text-center text-[#b91c1c]">
                  Quiz data unavailable. Please regenerate.
                </p>
              ) : (
                <>
                  <p className="mb-4 text-sm text-[#666666]">
                    Question {currentIdx + 1} of {quiz.length}
                  </p>
                  <h3 className="mb-4 text-lg font-semibold">
                    {quiz[currentIdx].question}
                  </h3>

                  {/* Options */}
                  {quiz[currentIdx].question_type === "mc" ? (
                    <div className="space-y-2">
                      {(quiz[currentIdx].options || []).map((opt, idx) => (
                        <label
                          key={idx}
                          className="flex cursor-pointer items-center gap-2 rounded border border-[#DDDDDD] p-2 hover:bg-[#F3F8FC]"
                        >
                          <input
                            type="radio"
                            name={`mcOpt-${currentIdx}`}
                            value={opt}
                            checked={answers[currentIdx] === opt}
                            onChange={(e) => handleSelect(e.target.value)}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {["True", "False"].map((val) => (
                        <label
                          key={val}
                          className="flex cursor-pointer items-center gap-2 rounded border border-[#DDDDDD] p-2 hover:bg-[#F3F8FC]"
                        >
                          <input
                            type="radio"
                            name={`tfOpt-${currentIdx}`}
                            value={val}
                            checked={answers[currentIdx] === val}
                            onChange={(e) => handleSelect(e.target.value)}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="mt-8 flex items-center justify-between">
                    <button
                      onClick={handlePrev}
                      className="rounded border border-[#3399FF] bg-white px-6 py-2 text-[#3399FF] transition hover:bg-[#E8F6FF]"
                      disabled={currentIdx === 0}
                    >
                      ‹ Previous
                    </button>

                    {currentIdx < quiz.length - 1 && (
                      <button
                        onClick={handleNext}
                        className="rounded bg-[#3399FF] px-6 py-2 text-white transition hover:bg-[#2785E3]"
                        disabled={answers[currentIdx] === undefined}
                      >
                        Next ›
                      </button>
                    )}

                    {currentIdx === quiz.length - 1 && (
                      <button
                        onClick={handleSubmit}
                        className="rounded bg-[#3399FF] px-6 py-2 text-white transition hover:bg-[#2785E3]"
                        disabled={!allAnswered}
                      >
                        📝 Submit Quiz
                      </button>
                    )}
                  </div>
                  {!allAnswered && currentIdx === quiz.length - 1 && (
                    <p className="mt-2 text-xs text-[#b91c1c]">
                      Answer all questions before submitting.
                    </p>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ---------- RESULT ---------- */}
          {stage === "result" && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-10 max-w-md rounded-lg border border-[#DDDDDD] bg-white p-6 text-center shadow"
            >
              <h2 className="text-2xl font-bold text-[#3A3A3A]">
                🎉 Practice Complete!
              </h2>
              <p className="mt-4 text-lg">
                You scored{" "}
                <span className="font-semibold text-[#3399FF]">
                  {score}/{quiz.length}
                </span>
              </p>
              <button
                onClick={() => setStage("config")}
                className="mt-6 rounded bg-[#3399FF] px-6 py-3 text-white transition hover:bg-[#2785E3]"
              >
                🔄 New Practice
              </button>
            </motion.div>
          )}
        </main>
      </div>
    </>
  );
}
