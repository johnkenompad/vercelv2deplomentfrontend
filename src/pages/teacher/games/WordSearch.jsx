/* --------------------------------------------------------------------------
   WordSearch.jsx – vivid-blue Teacher Generator + Assign flow (FIXED 2025-11-10)
   --------------------------------------------------------------------------
   🔑 What’s new
   • Firestore: save `gridRows` (flattened array<string>) instead of 2-D `grid`
   • Full file provided without omissions
---------------------------------------------------------------------------*/

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Download,
  Settings,
  Monitor,
  Bug,
  Sun,
  Moon,
  FilePlus,
  Send,
  PlusCircle,
} from "lucide-react";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/* ───────── Shared layout components ───────── */
import Sidebar from "../../../components/Sidebar";
import TeacherTopNavBar from "../../../components/TeacherTopNavBar";

/* ========= CONSTANTS ========= */
const GRID_SIZE = 14;
const CELL_SIZE = 40;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIRS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const HIGHLIGHTS = [
  "#f87171CC",
  "#60a5faCC",
  "#34d399CC",
  "#fbbf24CC",
  "#a78bfaCC",
  "#f472b6CC",
  "#22d3eeCC",
  "#93c5fdCC",
  "#c4b5fdCC",
];
const THEME_STYLES = {
  light: {
    pageBg: "bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF]",
    text: "text-[#333333]",
    functionBarBg: "bg-[#F3F8FC]",
    functionBarText: "text-[#333333]",
    cellText: "#000",
  },
  dark: {
    pageBg: "bg-[#111827]",
    text: "text-[#F6F7FF]",
    functionBarBg: "bg-[#1E293B]",
    functionBarText: "text-[#F8FAFC]",
    cellText: "#F8FAFC",
  },
};

/* ========= HELPERS ========= */
const sanitize = (w) => w.replace(/\s+/g, "").toUpperCase();
const inBounds = (r, c) =>
  r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
const rand = (n) => Math.floor(Math.random() * n);
function placeWords(empty, labels) {
  const grid = empty.map((r) => [...r]);
  const placements = [];
  labels.forEach((label, i) => {
    const word = sanitize(label);
    const letters = [...word];
    let placed = false,
      tries = 0;
    while (!placed && tries++ < 900) {
      const [dr, dc] = DIRS[rand(DIRS.length)];
      const sr = rand(GRID_SIZE);
      const sc = rand(GRID_SIZE);
      const er = sr + dr * (letters.length - 1);
      const ec = sc + dc * (letters.length - 1);
      if (!inBounds(er, ec)) continue;
      if (
        letters.every((l, k) => {
          const r = sr + dr * k,
            c = sc + dc * k;
          return !grid[r][c] || grid[r][c] === l;
        })
      ) {
        const coords = letters.map((_, k) => {
          const r = sr + dr * k,
            c = sc + dc * k;
          grid[r][c] = letters[k];
          return { r, c };
        });
        placements.push({
          word,
          label,
          cells: coords,
          color: HIGHLIGHTS[i % HIGHLIGHTS.length],
        });
        placed = true;
      }
    }
  });
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (!grid[r][c]) grid[r][c] = ALPHABET[rand(ALPHABET.length)];
  return { grid, placements };
}
const centerOf = (r, c) => ({
  x: c * CELL_SIZE + CELL_SIZE / 2,
  y: r * CELL_SIZE + CELL_SIZE / 2,
});

/* ========= COMPONENT ========= */
export default function WordSearch() {
  /* ───────── Router / location ───────── */
  const location = useLocation();
  const navigate  = useNavigate();

  /* ───────── Firebase ───────── */
  const auth = getAuth();
  const db   = getFirestore();

  /* ───────── UI state ───────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  );
  const styles = THEME_STYLES[theme];
  const handleSidebarToggle = (val) => {
    localStorage.setItem("sidebarMinimized", val);
    setSidebarMinimized(val);
  };
  const handleProfile = () => navigate("/profile");
  const handleLogout  = () => signOut(auth).then(() => navigate("/"));

  /* ───────── Word-search state ───────── */
  const defaultWords = [
    "DONKEY","PRINCESS","FARQUAAD","DRAGON","PUSS","GINGERBREAD",
    "PINOCCHIO","BLIND MICE","MONSIEUR","GEPPETTO","FIONA","PETER PAN",
    "SHREK","CASTLE","HOOD",
  ];
  const defaultClues = [
    "Which character is a talking donkey and best friend of Shrek?",
    "What is the title of Shrek's love interest who transforms into an ogre?",
    "Who is the tiny ruler obsessed with perfection in the movie Shrek?",
    "What fire-breathing creature falls in love with Donkey?",
    "Who is the charming feline swordsman with a signature hat and boots?",
    'What baked character is known for shouting "Not the gumdrop buttons!"?',
    "Who is the wooden puppet whose nose grows when he lies?",
    "What trio of visually impaired rodents appears in the Shrek movies?",
    "What is the name of the character based on a French Robin Hood parody?",
    "Who is the creator of Pinocchio?",
    "What classic fairytale character is portrayed as a strong female in Shrek?",
    "What famous character refuses to grow up and can fly?",
    "Who is the green ogre and main character of the movie?",
    "What small building is guarded by dragons and is where Fiona is locked away?",
    "Which common article of clothing is also the name of a character in the puzzle?",
  ];

  const [title, setTitle] = useState(
    location.state?.title || "Custom Word Search",
  );
  const [words, setWords] = useState(
    (location.state?.words?.length ? location.state.words : defaultWords)
      .map((w) => w.toUpperCase()),
  );
  const [clues, setClues] = useState(() => {
    if (location.state?.questions?.length)
      return location.state.questions.map((q) => q.clue);
    if (location.state?.clues?.length)
      return location.state.clues.map((w) => `Find: ${w}`);
    if (location.state?.words?.length)
      return location.state.words.map((w) => `Find: ${w}`);
    return defaultClues;
  });

  /* ───────── Grid generation ───────── */
  const [grid, setGrid]           = useState([]);
  const [placements, setPlacements] = useState([]);
  const regenerate = (list) => {
    if (!list.length) return;
    const { grid: g, placements: p } = placeWords(
      Array(GRID_SIZE)
        .fill()
        .map(() => Array(GRID_SIZE).fill(null)),
      list,
    );
    setGrid(g);
    setPlacements(p);
  };
  useEffect(() => regenerate(words), [words]);

  /* ───────── Modals state ───────── */
  const [showGenerator, setShowGenerator] = useState(false);
  const [genBusy, setGenBusy]             = useState(false);
  const [formTitle, setFormTitle]         = useState("");
  const [formWords, setFormWords]         = useState("");
  const [formFile, setFormFile]           = useState(null);
  const fileInputRef                      = useRef(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [dueDate, setDueDate]                 = useState("");
  const [assignBusy, setAssignBusy]           = useState(false);

  /* ───────── Students for assignment ───────── */
  const [students, setStudents]               = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "student"),
        );
        const snap = await getDocs(q);
        setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    });
    return () => unsub();
  }, [auth, db]);

  const toggleAll = (e) =>
    setSelectedStudents(
      e.target.checked ? students.map((s) => s.id) : [],
    );
  const toggleStudent = (id) =>
    setSelectedStudents((prev) =>
      prev.includes(id)
        ? prev.filter((sid) => sid !== id)
        : [...prev, id],
    );

  /* ───────── Printable HTML helper ───────── */
  const getPrintableHtml = () => {
    const css = `
body{font-family:sans-serif;padding:24px}
.grid{display:grid;grid-template-columns:repeat(${GRID_SIZE},28px);gap:4px}
.cell{width:28px;height:28px;border:1px solid #DDDDDD;text-align:center}
ul{columns:1;column-gap:24px}
li{margin-bottom:10px}`;
    const gridHtml = grid
      .map((r) => r.map((ch) => `<div class="cell">${ch}</div>`).join(""))
      .join("");
    const cluesHtml = clues
      .map((c, i) => `<li><strong>${i + 1}.)</strong> ${c}</li>`)
      .join("");
    return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><h2>${title}</h2><div style="display:flex;gap:24px"><div class="grid">${gridHtml}</div><div><h4>Clues</h4><ul>${cluesHtml}</ul></div></div></body></html>`;
  };

  /* ───────── Assign handler ───────── */
  const handleAssign = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("❗ Authentication failed. Please log in again.");
      return;
    }
    if (selectedStudents.length === 0) {
      alert("❗ Select at least one student.");
      return;
    }

    try {
      setAssignBusy(true);

      /* 🔑 Flatten grid to avoid nested arrays */
      const gridRows = grid.map((row) => row.join(""));

      /* 1. Save word search */
      const wsRef = await addDoc(collection(db, "wordsearches"), {
        title,
        words,
        clues,
        gridRows,
        gridSize: GRID_SIZE,
        teacherId: user.uid,
        createdAt: serverTimestamp(),
      });
      const wsId = wsRef.id;

      /* 2. Assignment sub-docs + notifications */
      await Promise.all(
        selectedStudents.map(async (sid) => {
          await setDoc(
            doc(db, `wordsearches/${wsId}/assignedTo/${sid}`),
            {
              assignedAt: serverTimestamp(),
              studentId : sid,
              deadline  : dueDate ? new Date(dueDate).toISOString() : null,
            },
          );
          await addDoc(collection(db, "notifications"), {
            userId   : sid,
            message  : `📢 New word search published: ${title}`,
            wordSearchId: wsId,
            read     : false,
            timestamp: serverTimestamp(),
          });
        }),
      );

      alert("✅ Word-Search published and students notified!");
      setShowAssignModal(false);
      setSelectedStudents([]);
      setDueDate("");
    } catch (err) {
      console.error(err);
      alert("❌ Assignment failed.");
    } finally {
      setAssignBusy(false);
    }
  };

  /* ───────── External generator submit ───────── */
  const submitGenerator = async () => {
    if (!formTitle.trim()) return alert("Please enter a puzzle title.");
    const data = new FormData();
    data.append("title", formTitle.trim());
    if (formWords.trim()) data.append("words", formWords.trim());
    if (formFile) data.append("file", formFile);
    try {
      setGenBusy(true);
      const res = await axios.post("/api/wordsearch/generate", data);
      const { title: newTitle, words: newWords, clues: newClues } = res.data;
      if (!Array.isArray(newWords) || !Array.isArray(newClues))
        throw new Error("Invalid response.");
      setTitle(newTitle || "Custom Word Search");
      setWords(newWords);
      setClues(newClues);
      setShowGenerator(false);
    } catch (err) {
      console.error(err);
      alert("Generation failed.");
    } finally {
      setGenBusy(false);
    }
  };

  /* ========= RENDER ========= */
  return (
    <>
      {/* Top navbar */}
      <TeacherTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={handleSidebarToggle}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      {/* Sidebar + page */}
      <div className={`flex h-screen pt-14 ${styles.pageBg} ${styles.text}`}>
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={handleSidebarToggle}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          <div className="mx-auto max-w-6xl p-8">
            {/* ── Header & Actions ── */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-extrabold text-[#3399FF]">
                {title}
              </h1>

              <div className="flex flex-wrap gap-3">
                {/* Back to Input page */}
                <button
                  onClick={() => navigate("/teacher/word-search/input")}
                  className="flex items-center gap-2 rounded-lg border border-[#3399FF] bg-white px-4 py-2 font-semibold text-[#3399FF] shadow hover:bg-[#E8F6FF]"
                >
                  <PlusCircle size={18} />
                  Generate Word-Search
                </button>

                {/* Assign */}
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2 font-semibold text-white shadow hover:bg-[#16A34A]"
                >
                  <Send size={18} />
                  Assign Word-Search
                </button>
              </div>
            </div>

            {/* ── Grid & Clues Preview ── */}
            <div className="mb-6 flex flex-col items-start gap-12 lg:flex-row lg:justify-between">
              {/* Grid */}
              <div
                className="relative select-none"
                style={{
                  width: GRID_SIZE * CELL_SIZE,
                  height: GRID_SIZE * CELL_SIZE,
                  pointerEvents: "none",
                }}
              >
                <svg
                  width={GRID_SIZE * CELL_SIZE}
                  height={GRID_SIZE * CELL_SIZE}
                  className="absolute inset-0"
                >
                  {placements.map((p, idx) => (
                    <polyline
                      key={idx}
                      points={p.cells
                        .map(
                          ({ r, c }) =>
                            `${centerOf(r, c).x},${centerOf(r, c).y}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke={p.color}
                      strokeWidth={2}
                      opacity="0.15"
                    />
                  ))}
                </svg>

                <div
                  className="absolute inset-0 z-10 grid"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE},${CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${GRID_SIZE},${CELL_SIZE}px)`,
                  }}
                >
                  {grid.map((row, r) =>
                    row.map((ch, c) => (
                      <div
                        key={`${r}-${c}`}
                        className="flex items-center justify-center border font-bold text-[18px]"
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          borderColor: "#DDDDDD",
                          color: styles.cellText,
                        }}
                      >
                        {ch}
                      </div>
                    )),
                  )}
                </div>
              </div>

              {/* Clues */}
              <div className="h-[560px] w-[380px] shrink-0 overflow-y-auto pt-1 lg:pt-6">
                <h3 className="mb-3 font-semibold">
                  Clues 1&nbsp;–&nbsp;{clues.length}
                </h3>
                <ul className="space-y-4 pr-2 text-sm">
                  {clues.map((c, i) => (
                    <li key={i} className="leading-snug">
                      <strong>{i + 1}.)</strong> {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Function Bar ── */}
            <div
              className={`flex flex-wrap items-center gap-6 rounded-xl border border-[#DDDDDD] p-3 ${styles.functionBarBg} ${styles.functionBarText}`}
            >
              <button
                onClick={() => {
                  const html = getPrintableHtml();
                  const w = window.open("", "_blank");
                  w?.document.write(html);
                  w?.document.close();
                  w?.print();
                }}
                className="flex items-center gap-2 hover:opacity-80"
              >
                <Download size={18} />
                Download / Print
              </button>

              <button
                onClick={() => setShowGenerator(true)}
                className="flex items-center gap-2 hover:opacity-80"
              >
                <Settings size={18} />
                Edit Grid
              </button>

              <button
                onClick={() => {
                  const next = theme === "light" ? "dark" : "light";
                  setTheme(next);
                  localStorage.setItem("theme", next);
                }}
                className="flex items-center gap-2 hover:opacity-80"
              >
                <Monitor size={18} />
                Theme:{" "}
                <span className="ml-1 flex items-center gap-1 rounded-full bg-[#F3F8FC] px-2 py-[2px] text-xs capitalize">
                  {theme === "light" ? <Sun size={12} /> : <Moon size={12} />}
                  &nbsp;{theme}
                </span>
              </button>

              <a
                href="mailto:support@quizrush.app?subject=WordSearch Bug"
                className="flex items-center gap-2 hover:opacity-80"
              >
                <Bug size={18} />
                Report a bug
              </a>
            </div>
          </div>

          {/* ── Generator Modal ── */}
          {showGenerator && (
            <Modal
              onClose={() => !genBusy && setShowGenerator(false)}
              title="Generate New Word-Search"
            >
              <div className="space-y-6 text-sm">
                {/* Puzzle Title */}
                <div>
                  <label className="mb-1 block font-medium text-[#333333]">
                    Puzzle Title
                  </label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-lg border border-[#DDDDDD] bg-[#F3F8FC] px-4 py-3 shadow-sm focus:ring-2 focus:ring-[#3399FF]"
                  />
                </div>

                {/* Custom Words */}
                <div>
                  <label className="mb-1 block font-medium text-[#333333]">
                    Custom Word List{" "}
                    <em className="font-normal">(one per line, optional)</em>
                  </label>
                  <textarea
                    value={formWords}
                    onChange={(e) => setFormWords(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-[#DDDDDD] bg-[#F3F8FC] px-4 py-3 shadow-sm focus:ring-2 focus:ring-[#3399FF]"
                  />
                </div>

                {/* Upload */}
                <div className="text-center text-[#333333]">— OR —</div>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 hover:bg-[#F3F8FC]"
                  >
                    <FilePlus size={18} />
                    Upload PDF / DOCX / Image
                  </button>
                  {formFile && (
                    <span className="mt-1 text-xs">{formFile.name}</span>
                  )}
                  <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setFormFile(e.target.files?.[0] || null)
                    }
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-2">
                  <button
                    disabled={genBusy}
                    onClick={submitGenerator}
                    className="flex items-center gap-2 rounded-lg bg-[#3399FF] px-4 py-3 font-semibold text-white shadow disabled:opacity-50 hover:bg-[#2785E3]"
                  >
                    {genBusy && (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    {genBusy ? "Generating…" : "Generate Puzzle"}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* ── Assign Modal ── */}
          {showAssignModal && (
            <Modal
              onClose={() => !assignBusy && setShowAssignModal(false)}
              title="Assign Word-Search to Students"
            >
              <div className="space-y-6 text-sm">
                {/* Students selector */}
                <div>
                  <label className="mb-1 block font-medium text-[#333333]">
                    Select Students
                  </label>
                  <div className="mt-1 max-h-40 overflow-y-auto rounded border border-[#DDDDDD] bg-[#F9FCFF] p-3">
                    <label className="mb-2 block">
                      <input
                        type="checkbox"
                        onChange={toggleAll}
                        checked={
                          selectedStudents.length === students.length &&
                          students.length > 0
                        }
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
                </div>

                {/* Deadline */}
                <div>
                  <label className="mb-1 block font-medium text-[#333333]">
                    Set Deadline <em className="font-normal">(optional)</em>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-[#DDDDDD] bg-[#F3F8FC] px-4 py-3 shadow-sm focus:ring-2 focus:ring-[#3399FF]"
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-2">
                  <button
                    disabled={assignBusy}
                    onClick={handleAssign}
                    className="flex items-center gap-2 rounded-lg bg-[#22C55E] px-4 py-3 font-semibold text-white shadow disabled:opacity-50 hover:bg-[#16A34A]"
                  >
                    {assignBusy && (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    {assignBusy ? "Assigning…" : "Assign Now"}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </main>
      </div>
    </>
  );
}

/* ========= Modal ========= */
function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md rounded-2xl border border-[#DDDDDD] bg-white p-6 shadow-2xl backdrop-blur-md">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 text-[#333333] hover:text-[#2785E3]"
        >
          &times;
        </button>
        <h3 className="mb-4 text-center text-lg font-extrabold text-[#3399FF]">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
