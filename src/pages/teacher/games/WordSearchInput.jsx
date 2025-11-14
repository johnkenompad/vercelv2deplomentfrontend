/* --------------------------------------------------------------------------
   WordSearchInput.jsx – Teacher Word-Search Input (Step 1) - UPDATED
   -------------------------------------------------------------------------- */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2, WandSparkles, ArrowRight } from "lucide-react";
import TeacherTopNavBar from "../../../components/TeacherTopNavBar";
import Sidebar from "../../../components/Sidebar";

const MIN_WORDS = 10;
const MAX_WORDS = 30;

export default function WordSearchInput() {
  /* ───────── Sidebar + Nav ───────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const toggleSidebar = () => {
    const next = !sidebarMinimized;
    localStorage.setItem("sidebarMinimized", next);
    setSidebarMinimized(next);
  };

  const navigate = useNavigate();

  /* ───────── Form state ───────── */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numWords, setNumWords] = useState(MIN_WORDS);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const formValid =
    title.trim() &&
    description.trim() &&
    numWords >= MIN_WORDS &&
    numWords <= MAX_WORDS;

  const allWordsFilled =
    words.length === numWords &&
    words.every((w) => w.trim() && !/\s/.test(w));

  /* ───────── Generate words via backend ───────── */
  const handleGenerate = async () => {
    if (!formValid) return;
    setErrorMsg("");
    try {
      setLoading(true);

      /* 🔥 FIXED: Changed endpoint to match backend route */
      const res = await axios.post("/api/wordsearch/generate-words", {
        title,
        description,
        numWords,
      });

      let newWords = res.data.words ?? [];

      if (!Array.isArray(newWords)) {
        newWords = String(res.data).split(/[,;\n]+/);
      }

      newWords = newWords
        .map((w) => w.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, numWords);

      if (newWords.length < numWords) {
        throw new Error("Not enough words returned.");
      }

      setWords(newWords);
    } catch (err) {
      console.error("❌ Word generation error:", err);
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to generate words. Try again.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  /* ───────── Proceed to puzzle layout ───────── */
  const handleProceed = () => {
    navigate("/teacher/word-search", { 
      state: { 
        title,
        description,
        words,
        clues: words, // Words as clues
        questions: words.map((word, idx) => ({
          id: idx + 1,
          word: word,
          clue: `Find: ${word}`
        }))
      } 
    });
  };

  /* ───────── Render ───────── */
  return (
    <>
      <TeacherTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={toggleSidebar}
      />

      <div
        className={`flex min-h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] ${
          sidebarMinimized ? "pl-20" : "pl-64"
        } transition-all duration-300`}
      >
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={toggleSidebar}
        />

        <main className="mx-auto w-full max-w-4xl p-8 text-[#333333]">
          <h1 className="mb-8 text-3xl font-extrabold text-[#3399FF]">
            Create Word-Search Puzzle
          </h1>

          {/* ── Input Card ── */}
          <div className="rounded-xl border border-[#E0E0E0] bg-white p-8 shadow">
            <div className="grid gap-6">
              {/* Title */}
              <div>
                <label className="mb-1 block font-semibold">Title *</label>
                <input
                  className="w-full rounded-lg border border-[#DDDDDD] bg-[#F3F8FC] px-4 py-3 focus:ring-2 focus:ring-[#3399FF]"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block font-semibold">
                  Description *
                </label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[#DDDDDD] bg-[#F3F8FC] px-4 py-3 focus:ring-2 focus:ring-[#3399FF]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Number of words */}
              <div>
                <label className="mb-1 block font-semibold">
                  Number of Words *
                </label>
                <select
                  className="w-32 rounded-lg border border-[#DDDDDD] bg-[#F3F8FC] px-3 py-2 focus:ring-2 focus:ring-[#3399FF]"
                  value={numWords}
                  onChange={(e) => setNumWords(Number(e.target.value))}
                >
                  {Array.from({ length: MAX_WORDS - MIN_WORDS + 1 }).map(
                    (_, i) => {
                      const n = i + MIN_WORDS;
                      return (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      );
                    },
                  )}
                </select>
              </div>

              {/* Generate button */}
              <div className="flex items-center gap-3">
                <button
                  disabled={!formValid || loading}
                  onClick={handleGenerate}
                  className="flex items-center gap-2 rounded-lg bg-[#3399FF] px-5 py-3 font-semibold text-white shadow hover:bg-[#2785E3] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <WandSparkles className="h-5 w-5" />
                  )}
                  {loading ? "Generating…" : "Generate Words"}
                </button>

                {errorMsg && (
                  <span className="text-sm text-[#E63946]">{errorMsg}</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Word list preview ── */}
          {words.length > 0 && (
            <div className="mt-10 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-bold text-[#3399FF]">
                Word List ({words.length}/{numWords})
              </h2>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {words.map((w, idx) => (
                  <input
                    key={idx}
                    className="rounded-lg border border-[#DDDDDD] bg-[#F3F8FC] px-3 py-2 text-center uppercase focus:ring-2 focus:ring-[#3399FF]"
                    value={w}
                    onChange={(e) => {
                      const next = [...words];
                      next[idx] = e.target.value.toUpperCase();
                      setWords(next);
                    }}
                  />
                ))}
              </div>

              <div className="mt-6 text-right">
                <button
                  disabled={!allWordsFilled}
                  onClick={handleProceed}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#22C55E] px-6 py-3 font-semibold text-white shadow hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Proceed to Word-Search
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}