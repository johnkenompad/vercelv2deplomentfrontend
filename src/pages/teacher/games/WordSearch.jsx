import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import {
  Download,
  Settings,
  Monitor,
  Bug,
  Sun,
  Moon,
  FilePlus,
} from "lucide-react";

/* =========  CONSTANTS  ===================================== */
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
    pageBg: "bg-[#F6EFFC]",
    text: "text-[#5C517B]",
    functionBarBg: "bg-[#FFFCEB]",
    functionBarText: "text-[#5a3b14]",
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

/* =========  HELPERS  ======================================= */
const sanitize = (w) => w.replace(/\s+/g, "").toUpperCase();
const inBounds = (r, c) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
const rand = (n) => Math.floor(Math.random() * n);

function placeWords(empty, labels) {
  const grid = empty.map((row) => [...row]);
  const placements = [];
  labels.forEach((label, i) => {
    const word = sanitize(label);
    const letters = word.split("");
    let placed = false,
      tries = 0;
    while (!placed && tries++ < 900) {
      const [dr, dc] = DIRS[rand(DIRS.length)];
      const sr = rand(GRID_SIZE),
        sc = rand(GRID_SIZE);
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
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) grid[r][c] = ALPHABET[rand(ALPHABET.length)];
    }
  }
  return { grid, placements };
}
const directionOf = (a, b) => {
  const dr = b.r - a.r,
    dc = b.c - a.c;
  if (!dr && !dc) return null;
  const nr = Math.sign(dr),
    nc = Math.sign(dc);
  if (nr && nc && Math.abs(dr) !== Math.abs(dc)) return null;
  return { nr, nc };
};
const buildPath = (a, b) => {
  const dir = directionOf(a, b);
  if (!dir) return [];
  const path = [];
  let { r, c } = a;
  while (true) {
    path.push({ r, c });
    if (r === b.r && c === b.c) break;
    r += dir.nr;
    c += dir.nc;
    if (!inBounds(r, c)) break;
  }
  return path;
};
const centerOf = (r, c) => ({
  x: c * CELL_SIZE + CELL_SIZE / 2,
  y: r * CELL_SIZE + CELL_SIZE / 2,
});

/* =========  COMPONENT  ===================================== */
export default function WordSearch() {
  /* ----- theme / sidebar state ----- */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true"
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const styles = THEME_STYLES[theme];

  /* ----- puzzle data ----- */
  const [title, setTitle] = useState("Shrek Universe");
  const [words, setWords] = useState([
    "DONKEY",
    "PRINCESS",
    "FARQUAAD",
    "DRAGON",
    "PUSS",
    "GINGERBREAD",
    "PINOCCHIO",
    "BLIND MICE",
    "MONSIEUR",
    "GEPPETTO",
    "FIONA",
    "PETER PAN",
    "SHREK",
    "CASTLE",
    "HOOD",
  ]);
  const [clues, setClues] = useState([
    "Which character is a talking donkey and best friend of Shrek?",
    "What is the title of Shrek’s love interest who transforms into an ogre?",
    "Who is the tiny ruler obsessed with perfection in the movie Shrek?",
    "What fire-breathing creature falls in love with Donkey?",
    "Who is the charming feline swordsman with a signature hat and boots?",
    "What baked character is known for shouting “Not the gumdrop buttons!”?",
    "Who is the wooden puppet whose nose grows when he lies?",
    "What trio of visually impaired rodents appears in the Shrek movies?",
    "What is the name of the character based on a French Robin Hood parody?",
    "Who is the creator of Pinocchio?",
    "What classic fairytale character is portrayed as a strong female in Shrek?",
    "What famous character refuses to grow up and can fly?",
    "Who is the green ogre and main character of the movie?",
    "What small building is often guarded by dragons in fairytales and is where Fiona is locked away?",
    "Which common article of clothing is also the name of a character in the puzzle?",
  ]);
  const [grid, setGrid] = useState([]);
  const [placements, setPlacements] = useState([]);

  /* ----- interactive state ----- */
  const [found, setFound] = useState({});
  const [foundLines, setFoundLines] = useState([]);
  const [hoverPath, setHoverPath] = useState([]);
  const [startCell, setStartCell] = useState(null);
  const [startColor, setStartColor] = useState("#D9F99DCC");

  // answers typed + score
  const [answers, setAnswers] = useState(Array(clues.length).fill(""));
  const [score, setScore] = useState(null);

  /* ----- modals / form state ----- */
  const [showSettings, setShowSettings] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formWords, setFormWords] = useState("");
  const [formFile, setFormFile] = useState(null);
  const fileInputRef = useRef(null);

  /* ----- misc refs ----- */
  const mouseDownRef = useRef(false);

  /* ===== generate puzzle on mount / whenever words change ===== */
  const regenerate = (wordsArr) => {
    const empty = Array(GRID_SIZE)
      .fill()
      .map(() => Array(GRID_SIZE).fill(null));
    const { grid: g, placements: p } = placeWords(empty, wordsArr);
    setGrid(g);
    setPlacements(p);
    setFound({});
    setFoundLines([]);
    setHoverPath([]);
    setStartCell(null);
    setStartColor("#D9F99DCC");
    setAnswers(Array(clues.length).fill(""));
    setScore(null);
    mouseDownRef.current = false;
  };
  useEffect(() => {
    regenerate(words);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  /* ===== mouse events ===== */
  useEffect(() => {
    const onUp = () => {
      if (!mouseDownRef.current) return;
      if (startCell && hoverPath.length >= 2) {
        const str = hoverPath.map(({ r, c }) => grid[r][c]).join("");
        const rev = str.split("").reverse().join("");
        const match = placements.find(
          (p) => (p.word === str || p.word === rev) && !found[p.label]
        );
        if (match) {
          setFound((prev) => ({ ...prev, [match.label]: true }));
          setFoundLines((prev) => [
            ...prev,
            {
              a: hoverPath[0],
              b: hoverPath[hoverPath.length - 1],
              color: match.color,
            },
          ]);
        }
      }
      mouseDownRef.current = false;
      setHoverPath([]);
      setStartCell(null);
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [hoverPath, startCell, grid, placements, found]);

  const handleMove = (e) => {
    if (!mouseDownRef.current || !startCell) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const row = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    if (!inBounds(row, col)) return;
    setHoverPath(buildPath(startCell, { r: row, c: col }));
  };

  /* ===== printable HTML ===== */
  const getPrintableHtml = () => {
    const css = `
      body{font-family:sans-serif;padding:24px;}
      .grid{display:grid;grid-template-columns:repeat(${GRID_SIZE},28px);gap:4px;}
      .cell{width:28px;height:28px;border:1px solid #EBD3FA;text-align:center;}
      ul{columns:1;column-gap:24px;} li{margin-bottom:10px;}
      .strike{text-decoration:line-through;opacity:.6;}
    `;
    const gridHtml = grid
      .map((r) => r.map((ch) => `<div class="cell">${ch}</div>`).join(""))
      .join("");
    const cluesHtml = clues
      .map(
        (c, i) =>
          `<li class="${found[words[i]] ? "strike" : ""}"><strong>${
            i + 1
          }.)</strong> ${c}</li>`
      )
      .join("");
    return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
      <h2>${title}</h2>
      <div style="display:flex;gap:24px;">
        <div class="grid">${gridHtml}</div>
        <div>
          <h4>Clues</h4><ul>${cluesHtml}</ul>
        </div>
      </div>
      </body></html>`;
  };

  /* ===== generator submit ===== */
  const submitGenerator = async () => {
    if (!formTitle.trim())
      return alert("Please enter a puzzle title (e.g., 'Outer Space').");

    const data = new FormData();
    data.append("title", formTitle.trim());
    if (formWords.trim()) data.append("words", formWords.trim());
    if (formFile) data.append("file", formFile);

    try {
      setGenBusy(true);
      const res = await axios.post("/api/wordsearch/generate", data);
      const { title, words: newWords, clues: newClues } = res.data;
      if (!Array.isArray(newWords) || !Array.isArray(newClues)) {
        throw new Error("Invalid response from server.");
      }
      setTitle(title || "Custom Word Search");
      setWords(newWords);
      setClues(newClues);
      setShowGenerator(false);
    } catch (err) {
      console.error(err);
      alert("Generation failed – see console.");
    } finally {
      setGenBusy(false);
    }
  };

  /* ===== render ===== */
  return (
    <div
      className={`flex min-h-screen transition-[padding] duration-300 ease-in-out ${styles.pageBg} ${styles.text} ${
        sidebarMinimized ? "pl-[72px]" : "pl-[240px]"
      }`}
    >
      <Sidebar
        minimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
      />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* title uses brand primary */}
          <h1 className="text-3xl font-extrabold mb-6 text-[#B76EF1]">
            {title}
          </h1>

          {/* puzzle + clues */}
          <div className="flex flex-col lg:flex-row lg:justify-between gap-12 items-start mb-6">
            {/* grid */}
            <div
              className="relative select-none"
              style={{
                width: GRID_SIZE * CELL_SIZE,
                height: GRID_SIZE * CELL_SIZE,
              }}
              onMouseMove={handleMove}
              onMouseLeave={() => mouseDownRef.current && setHoverPath([])}
              onMouseDown={(e) => e.preventDefault()}
            >
              <svg
                width={GRID_SIZE * CELL_SIZE}
                height={GRID_SIZE * CELL_SIZE}
                className="absolute inset-0"
                style={{ zIndex: 10, pointerEvents: "none" }}
              >
                {foundLines.map((l, i) => (
                  <line
                    key={i}
                    x1={centerOf(l.a.r, l.a.c).x}
                    y1={centerOf(l.a.r, l.a.c).y}
                    x2={centerOf(l.b.r, l.b.c).x}
                    y2={centerOf(l.b.r, l.b.c).y}
                    stroke={l.color}
                    strokeWidth={CELL_SIZE * 0.7}
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                ))}
                {hoverPath.map((cell, i) => (
                  <rect
                    key={i}
                    x={cell.c * CELL_SIZE + 4}
                    y={cell.r * CELL_SIZE + 4}
                    width={CELL_SIZE - 8}
                    height={CELL_SIZE - 8}
                    rx={10}
                    ry={10}
                    fill={startColor}
                    opacity="0.4"
                  />
                ))}
                {startCell && (
                  <circle
                    cx={centerOf(startCell.r, startCell.c).x}
                    cy={centerOf(startCell.r, startCell.c).y}
                    r={CELL_SIZE * 0.36}
                    fill={startColor}
                    opacity="0.95"
                  />
                )}
              </svg>

              {/* letters */}
              <div
                className="grid absolute inset-0 z-20"
                style={{
                  gridTemplateColumns: `repeat(${GRID_SIZE},${CELL_SIZE}px)`,
                  gridTemplateRows: `repeat(${GRID_SIZE},${CELL_SIZE}px)`,
                }}
              >
                {grid.map((row, r) =>
                  row.map((ch, c) => (
                    <div
                      key={`${r}-${c}`}
                      onMouseDown={() => {
                        mouseDownRef.current = true;
                        setStartCell({ r, c });
                        setHoverPath([{ r, c }]);
                        setStartColor(
                          HIGHLIGHTS[(r + c) % HIGHLIGHTS.length]
                        );
                      }}
                      className="flex items-center justify-center font-bold text-[18px] border"
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        borderColor: "#EBD3FA", // brand border
                        color: styles.cellText,
                      }}
                    >
                      {ch}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Words-Found panel */}
            <div className="hidden lg:flex flex-col items-center w-[180px] gap-2">
              <h3 className="font-semibold">Words&nbsp;Found</h3>
              <div className="text-sm font-medium">
                {Object.keys(found).length} / {words.length}
              </div>
              <ol className="mt-1 space-y-1 text-sm list-decimal list-inside max-h-[520px] overflow-y-auto">
                {Object.keys(found).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ol>
            </div>

            {/* --- Clue Panel --- */}
            <div className="w-[360px] shrink-0 h-[560px] flex flex-col pt-1 lg:pt-6 lg:ml-auto">
              <h3 className="font-semibold mb-2">Clues 1 – {clues.length}</h3>

              {/* Scrollable clue list */}
              <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                {clues.map((c, i) => (
                  <div key={`clue-${i}`}>
                    <div className="text-sm font-medium leading-snug mb-1">
                      {i + 1}.) {c}
                    </div>
                    <input
                      type="text"
                      value={answers[i] || ""}
                      onChange={(e) =>
                        setAnswers((prev) => {
                          const copy = [...prev];
                          copy[i] = e.target.value;
                          return copy;
                        })
                      }
                      className="w-full px-4 py-3 border rounded-lg shadow-sm bg-[#F6EFFC] border-[#EBD3FA] text-[#5C517B] focus:outline-none focus:ring-2 focus:ring-[#B76EF1] transition text-sm"
                      placeholder="Type your answer here..."
                    />
                  </div>
                ))}
              </div>

              {/* action buttons */}
              <div className="mt-6 flex gap-3 flex-wrap">
                <button
                  onClick={() => regenerate(words)}
                  className="px-3 py-2 rounded-lg shadow bg-[#B76EF1] text-white font-semibold hover:bg-[#974EC3] transition"
                >
                  New Puzzle
                </button>
                <button
                  onClick={() => setShowGenerator(true)}
                  className="px-3 py-2 rounded-lg border border-[#EBD3FA] bg-white hover:bg-[#F6EFFC] text-[#5C517B] inline-flex items-center gap-1 transition"
                >
                  <FilePlus size={16} /> New Word-Search Type
                </button>
              </div>

              {/* Submit & score */}
              <button
                onClick={() => {
                  const wordScore = Object.keys(found).length;
                  let clueScore = 0;
                  answers.forEach((ans, idx) => {
                    if (ans && sanitize(ans) === sanitize(words[idx]))
                      clueScore++;
                  });
                  setScore({
                    wordScore,
                    clueScore,
                    total: wordScore + clueScore,
                  });
                }}
                className="mt-4 px-4 py-3 rounded-lg shadow bg-[#22C55E] text-white font-semibold hover:bg-[#16A34A] transition"
              >
                Submit Answers
              </button>

              {score && (
                <div className="mt-3 text-sm font-medium">
                  ✅ Words found: {score.wordScore} / {words.length} <br />
                  ✅ Clue answers: {score.clueScore} / {clues.length} <br />
                  🏆{" "}
                  <span className="text-lg">Total: {score.total}</span>
                </div>
              )}

              {words.every((w) => found[w]) && (
                <div className="mt-4 text-[#1B7F78] font-semibold">
                  🎉 Nice! You found them all.
                </div>
              )}
            </div>
          </div>

          {/* function bar */}
          <div
            className={`flex flex-wrap items-center gap-6 p-3 rounded-xl border border-[#EBD3FA] ${styles.functionBarBg} ${styles.functionBarText}`}
          >
            <button
              onClick={() => {
                const html = getPrintableHtml();
                const w = window.open("", "_blank");
                w?.document.write(html);
                w?.document.close();
                w?.print();
              }}
              className="inline-flex items-center gap-2 hover:opacity-80 transition"
            >
              <Download size={18} /> Download / Print
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 hover:opacity-80 transition"
            >
              <Settings size={18} /> Puzzle Settings
            </button>
            <button
              onClick={() => {
                const next = theme === "light" ? "dark" : "light";
                setTheme(next);
                localStorage.setItem("theme", next);
              }}
              className="inline-flex items-center gap-2 hover:opacity-80 transition"
            >
              <Monitor size={18} />
              Theme:
              <span className="ml-1 flex items-center gap-1 px-2 py-[2px] rounded-full bg-[#F6EFFC] text-xs capitalize">
                {theme === "light" ? <Sun size={12} /> : <Moon size={12} />}
                {theme}
              </span>
            </button>
            <a
              href="mailto:support@quizrush.app?subject=WordSearch Bug"
              className="inline-flex items-center gap-2 hover:opacity-80 transition"
            >
              <Bug size={18} /> Report a bug
            </a>
          </div>

          {/* settings modal */}
          {showSettings && (
            <Modal
              onClose={() => setShowSettings(false)}
              title="Puzzle Settings"
            >
              <p className="text-sm text-[#5C517B]">
                Coming soon – set grid size, allow diagonals, etc.
              </p>
            </Modal>
          )}

          {/* generator modal */}
          {showGenerator && (
            <Modal
              onClose={() => !genBusy && setShowGenerator(false)}
              title="Generate New Word-Search"
            >
              <div className="space-y-6 text-sm">
                <div>
                  <label className="block font-medium mb-1 text-[#5C517B]">
                    Puzzle Title
                  </label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-[#EBD3FA] rounded-lg shadow-sm bg-[#F6EFFC] text-[#5C517B] focus:outline-none focus:ring-2 focus:ring-[#B76EF1]"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-[#5C517B]">
                    Custom Word List{" "}
                    <em className="font-normal">(one per line, optional)</em>
                  </label>
                  <textarea
                    value={formWords}
                    onChange={(e) => setFormWords(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-[#EBD3FA] rounded-lg shadow-sm bg-[#F6EFFC] text-[#5C517B] focus:outline-none focus:ring-2 focus:ring-[#B76EF1] resize-none"
                  />
                </div>
                <div className="text-center text-[#5C517B]">— OR —</div>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#EBD3FA] bg-white hover:bg-[#F6EFFC] transition"
                  >
                    <FilePlus size={18} /> Upload PDF / DOCX / Image
                  </button>
                  {formFile && (
                    <span className="mt-1 text-xs text-[#5C517B]">
                      {formFile.name}
                    </span>
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
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    disabled={genBusy}
                    onClick={submitGenerator}
                    className="px-4 py-3 rounded-lg shadow bg-[#B76EF1] text-white font-semibold hover:bg-[#974EC3] disabled:opacity-50 flex items-center gap-2 transition"
                  >
                    {genBusy && (
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    {genBusy ? "Generating…" : "Generate Puzzle"}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----- simple modal component ----- */
function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl border border-[#EBD3FA] p-6 backdrop-blur-md relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-[#5C517B] hover:text-[#974EC3]"
        >
          &times;
        </button>
        <h3 className="text-lg font-extrabold text-[#B76EF1] mb-4 text-center">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
