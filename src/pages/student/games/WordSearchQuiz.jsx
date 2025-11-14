/* --------------------------------------------------------------------------
   WordSearchQuiz.jsx – Student version (COMPLETE)
   • Loads assigned word search from backend
   • Submits answers and score to Firestore
   • Vivid-blue theme with student layout
---------------------------------------------------------------------------*/
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";                           // 🔧 fixed path
import axios from "axios";
import { Download, Monitor, Bug, Sun, Moon, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

/* Shared layout components */
import StudentSidebar from "../../../components/StudentSidebar";    // 🔧 fixed path
import StudentTopNavBar from "../../../components/StudentTopNavBar"; // 🔧 fixed path

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
const inBounds = (r, c) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
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

/* ========= COMPONENT ========= */
export default function WordSearchQuiz() {
  const { wordSearchId } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();

  /* ────────── UI state ────────── */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true"
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const styles = THEME_STYLES[theme];

  /* ────────── Auth & User ────────── */
  const [currentUser, setCurrentUser] = useState(null);
  const [studentName, setStudentName] = useState("");

  /* ────────── Word-search state ────────── */
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("Word Search");
  const [description, setDescription] = useState("");
  const [words, setWords] = useState([]);
  const [clues, setClues] = useState([]);
  const [grid, setGrid] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [found, setFound] = useState({});
  const [foundLines, setFoundLines] = useState([]);
  const [hoverPath, setHoverPath] = useState([]);
  const [startCell, setStartCell] = useState(null);
  const [startColor, setStartColor] = useState("#D9F99DCC");
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(null);
  const [startTime] = useState(Date.now());
  const mouseDownRef = useRef(false);

  const handleSidebarToggle = (val) => {
    localStorage.setItem("sidebarMinimized", val);
    setSidebarMinimized(val);
  };

  /* ────────── Auth check ────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUser(user);

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          const fullName = [d.firstName, d.middleName, d.lastName]
            .filter(Boolean)
            .join(" ");
          setStudentName(
            fullName || user.displayName || user.email?.split("@")[0] || "Student"
          );
        } else {
          setStudentName(
            user.displayName || user.email?.split("@")[0] || "Student"
          );
        }
      } catch (err) {
        console.error("User fetch error:", err);
        setStudentName(
          user.displayName || user.email?.split("@")[0] || "Student"
        );
      }
    });

    return () => unsub();
  }, [auth, navigate]);

  /* ────────── Load word search from backend ────────── */
  useEffect(() => {
    if (!wordSearchId || !currentUser) return;

    const fetchWordSearch = async () => {
      try {
        setLoading(true);
        const apiKey = process.env.REACT_APP_ADMIN_API_KEY;

        const response = await axios.get(`/api/wordsearch/${wordSearchId}`, {
          headers: { "x-api-key": apiKey },
        });

        const data = response.data;
        setTitle(data.title || "Word Search");
        setDescription(data.description || "");
        setWords(data.words || []);
        setClues(data.clues || data.words || []);
        setAnswers(Array(data.clues?.length || data.words?.length || 0).fill(""));
      } catch (err) {
        console.error("❌ Failed to load word search:", err);
        toast.error("Failed to load word search. Please try again.");
        navigate("/student/assigned-word-searches");
      } finally {
        setLoading(false);
      }
    };

    fetchWordSearch();
  }, [wordSearchId, currentUser, navigate]);

  /* ────────── Generate puzzle once words are loaded ────────── */
  useEffect(() => {
    if (words.length === 0) return;

    const { grid: g, placements: p } = placeWords(
      Array(GRID_SIZE)
        .fill()
        .map(() => Array(GRID_SIZE).fill(null)),
      words
    );
    setGrid(g);
    setPlacements(p);
  }, [words]);

  /* ────────── Mouse events ────────── */
  useEffect(() => {
    const onUp = () => {
      if (!mouseDownRef.current) return;
      if (startCell && hoverPath.length >= 2) {
        const str = hoverPath.map(({ r, c }) => grid[r][c]).join("");
        const rev = [...str].reverse().join("");
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

  /* ────────── Submit answers ────────── */
  const handleSubmit = async () => {
    if (submitting) return;

    const wordScore = Object.keys(found).length;
    let clueScore = 0;
    answers.forEach((ans, idx) => {
      if (ans && sanitize(ans) === sanitize(words[idx])) clueScore++;
    });

    const totalScore = wordScore + clueScore;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000); // seconds

    setScore({ wordScore, clueScore, total: totalScore });

    try {
      setSubmitting(true);
      const apiKey = process.env.REACT_APP_ADMIN_API_KEY;

      await axios.post(
        "/api/wordsearch/submit",
        {
          wordSearchId,
          studentId: currentUser.uid,
          studentName,
          studentEmail: currentUser.email,
          answers,
          wordsFound: Object.keys(found),
          score: { wordScore, clueScore, total: totalScore },
          timeSpent,
        },
        {
          headers: { "x-api-key": apiKey },
        }
      );

      toast.success("Your answers have been submitted! 🎉");
    } catch (err) {
      console.error("❌ Submit error:", err);
      toast.error("Failed to submit answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ────────── Print Helper ────────── */
  const getPrintableHtml = () => {
    const css = `body{font-family:sans-serif;padding:24px}.grid{display:grid;grid-template-columns:repeat(${GRID_SIZE},28px);gap:4px}.cell{width:28px;height:28px;border:1px solid #DDDDDD;text-align:center}ul{columns:1;column-gap:24px}li{margin-bottom:10px}.strike{text-decoration:line-through;opacity:.6}`;
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
    return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><h2>${title}</h2><div style="display:flex;gap:24px"><div class="grid">${gridHtml}</div><div><h4>Clues</h4><ul>${cluesHtml}</ul></div></div></body></html>`;
  };

  const handleProfile = () => navigate("/student/profile");
  const handleLogout = () => {
    auth.signOut().then(() => navigate("/"));
  };

  /* ========= LOADING STATE ========= */
  if (loading) {
    return (
      <>
        <StudentTopNavBar
          sidebarMinimized={sidebarMinimized}
          setSidebarMinimized={handleSidebarToggle}
          onProfileClick={handleProfile}
          onLogoutClick={handleLogout}
        />
        <div className={`flex h-screen pt-14 ${styles.pageBg} ${styles.text}`}>
          <StudentSidebar
            minimized={sidebarMinimized}
            setSidebarMinimized={handleSidebarToggle}
          />
          <main
            className={`flex-1 flex items-center justify-center transition-all duration-300 ${
              sidebarMinimized ? "ml-20" : "ml-64"
            }`}
          >
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#3399FF]" />
              <p className="mt-4 text-lg">Loading word search...</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  /* ========= RENDER ========= */
  return (
    <>
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={handleSidebarToggle}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      <div className={`flex h-screen pt-14 ${styles.pageBg} ${styles.text}`}>
        <StudentSidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={handleSidebarToggle}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          <div className="mx-auto max-w-6xl p-8">
            <h1 className="mb-2 text-3xl font-extrabold text-[#3399FF]">
              {title}
            </h1>
            {description && (
              <p className="mb-6 text-sm text-[#666666]">{description}</p>
            )}

            {/* puzzle + clues */}
            <div className="mb-6 flex flex-col items-start gap-12 lg:flex-row lg:justify-between">
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
                  className="absolute inset-0 pointer-events-none"
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
                      opacity=".9"
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
                      opacity=".4"
                    />
                  ))}
                  {startCell && (
                    <circle
                      cx={centerOf(startCell.r, startCell.c).x}
                      cy={centerOf(startCell.r, startCell.c).y}
                      r={CELL_SIZE * 0.36}
                      fill={startColor}
                      opacity=".95"
                    />
                  )}
                </svg>

                {/* letters */}
                <div
                  className="absolute inset-0 z-20 grid"
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
                        className="flex items-center justify-center border font-bold text-[18px]"
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          borderColor: "#DDDDDD",
                          color: styles.cellText,
                          userSelect: "none",
                        }}
                      >
                        {ch}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Words-Found */}
              <div className="hidden w-[180px] flex-col items-center gap-2 lg:flex">
                <h3 className="font-semibold">Words&nbsp;Found</h3>
                <div className="text-sm font-medium">
                  {Object.keys(found).length} / {words.length}
                </div>
                <ol className="mt-1 max-h-[520px] list-decimal list-inside space-y-1 overflow-y-auto text-sm">
                  {Object.keys(found).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ol>
              </div>

              {/* Clue Panel */}
              <div className="flex h-[560px] w-[360px] shrink-0 flex-col pt-1 lg:ml-auto lg:pt-6">
                <h3 className="mb-2 font-semibold">
                  Clues 1 – {clues.length}
                </h3>
                <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                  {clues.map((c, i) => (
                    <div key={i}>
                      <div className="mb-1 text-sm font-medium leading-snug">
                        {i + 1}.) {c}
                      </div>
                      <input
                        value={answers[i] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => {
                            const cp = [...prev];
                            cp[i] = e.target.value;
                            return cp;
                          })
                        }
                        disabled={!!score}
                        className="w-full rounded-lg border border-[#DDDDDD] bg-[#F3F8FC] px-4 py-3 text-sm text-[#333333] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3399FF] disabled:opacity-50"
                        placeholder="Type your answer here..."
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!!score || submitting}
                  className="mt-4 rounded-lg bg-[#22C55E] px-4 py-3 font-semibold text-white shadow hover:bg-[#16A34A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : score ? (
                    "Submitted ✓"
                  ) : (
                    "Submit Answers"
                  )}
                </button>

                {score && (
                  <div className="mt-3 text-sm font-medium">
                    ✅ Words found: {score.wordScore} / {words.length} <br />
                    ✅ Clue answers: {score.clueScore} / {clues.length} <br />
                    🏆 <span className="text-lg">Total: {score.total}</span>
                  </div>
                )}

                {words.every((w) => found[w]) && !score && (
                  <div className="mt-4 font-semibold text-[#1B7F78]">
                    🎉 Nice! You found them all. Don't forget to submit!
                  </div>
                )}
              </div>
            </div>

            {/* function bar */}
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
                <Download size={18} /> Download&nbsp;/&nbsp;Print
              </button>
              <button
                onClick={() => {
                  const next = theme === "light" ? "dark" : "light";
                  setTheme(next);
                  localStorage.setItem("theme", next);
                }}
                className="flex items-center gap-2 hover:opacity-80"
              >
                <Monitor size={18} /> Theme:
                <span className="ml-1 flex items-center gap-1 rounded-full bg-[#F3F8FC] px-2 py-[2px] text-xs capitalize">
                  {theme === "light" ? <Sun size={12} /> : <Moon size={12} />}
                  &nbsp;{theme}
                </span>
              </button>
              <a
                href="mailto:support@quizrush.app?subject=WordSearch%20Bug"
                className="flex items-center gap-2 hover:opacity-80"
              >
                <Bug size={18} /> Report&nbsp;a&nbsp;bug
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
