import React, { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar';
import axios from 'axios';

const gridSize = 10;

export default function Crossword() {
  const [sidebarMinimized, setSidebarMinimized] = useState(() =>
    localStorage.getItem('sidebarMinimized') === 'true'
  );

  const [grid, setGrid] = useState([]);
  const [clues, setClues] = useState([]);
  const [clueMap, setClueMap] = useState({});
  const [gridLetters, setGridLetters] = useState(Array(gridSize * gridSize).fill(''));
  const [selectedClueIndex, setSelectedClueIndex] = useState(null);
  const [reveal, setReveal] = useState(false);

  const toFlatIndex = (row, col) => row * gridSize + col;

  const generateClueMap = (cluesList) => {
    const map = {};
    cluesList.forEach((clue, index) => {
      const positions = [];
      for (let i = 0; i < clue.answer.length; i++) {
        const start = clue.start;
        const row = Math.floor(start / gridSize);
        const col = start % gridSize;
        const pos =
          clue.direction === 'across'
            ? toFlatIndex(row, col + i)
            : toFlatIndex(row + i, col);
        positions.push(pos);
      }
      map[index] = positions;
    });
    return map;
  };

  const fetchNewPuzzle = async () => {
    try {
      const res = await axios.get('/api/generate-crossword-clues');
      const { grid, clues } = res.data;

      setGrid(grid);
      setClues(clues);
      setClueMap(generateClueMap(clues));
      setGridLetters(Array(gridSize * gridSize).fill(''));
      setReveal(false);
      setSelectedClueIndex(null);
    } catch (err) {
      console.error('❌ Failed to load puzzle:', err);
      alert('❌ Error generating puzzle. Check backend.');
    }
  };

  useEffect(() => {
    fetchNewPuzzle();
  }, []);

  const getCorrectLetter = (index) => {
    for (let i = 0; i < clues.length; i++) {
      const positions = clueMap[i];
      const posIndex = positions?.indexOf(index);
      if (posIndex !== -1) {
        return clues[i].answer[posIndex];
      }
    }
    return '';
  };

  const handleInputChange = (index, value) => {
    if (!/^[a-zA-Z]?$/.test(value)) return;
    const updated = [...gridLetters];
    updated[index] = value.toUpperCase();
    setGridLetters(updated);

    if (selectedClueIndex !== null && value.length === 1) {
      const positions = clueMap[selectedClueIndex];
      const currentPos = positions.indexOf(index);
      const nextPos = positions[currentPos + 1];
      if (nextPos !== undefined) {
        const nextInput = document.getElementById(`cell-${nextPos}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const getCellNumber = (index) => {
    return clues.find(clue => clue.start === index)?.number || null;
  };

  const getCellStyle = (index) => {
    if (!gridLetters[index]) return '';
    const correct = getCorrectLetter(index);
    if (!correct) return '';
    return gridLetters[index] !== correct ? 'bg-red-100' : '';
  };

  const isBlackCell = (row, col) => grid?.[row]?.[col] === 'B';

  return (
    <div className="flex min-h-screen bg-[#F6EFFC] text-[#5C517B]">
      <Sidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />

      <div className={`flex-1 p-6 transition-all duration-300 ${sidebarMinimized ? 'ml-[72px]' : 'ml-[240px]'}`}>
        <h1 className="text-2xl font-bold mb-4">🧩 Crossword Puzzle</h1>
        <p className="mb-6">Click a clue to activate. Then type letters directly inside the white cells.</p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={fetchNewPuzzle}
            className="px-4 py-2 bg-[#5C517B] text-white rounded hover:bg-[#3e365c] transition"
          >
            🧠 New Puzzle
          </button>
          <button
            onClick={() => setReveal(true)}
            disabled={clues.length === 0}
            className="px-4 py-2 bg-[#B76EF1] text-white rounded hover:bg-[#974EC3] transition disabled:opacity-50"
          >
            🔓 Reveal Answers
          </button>
        </div>

        {grid.length === 0 || clues.length === 0 ? (
          <div className="text-center text-lg text-[#5C517B] font-medium">
            ⏳ Generating crossword puzzle...
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="grid grid-cols-10 gap-1 w-fit border border-[#EBD3FA] p-2 bg-white rounded-md shadow">
              {Array.from({ length: grid.length }).map((_, row) =>
                Array.from({ length: grid[row].length }).map((_, col) => {
                  const index = toFlatIndex(row, col);
                  const isBlack = isBlackCell(row, col);
                  const number = getCellNumber(index);
                  const correctLetter = getCorrectLetter(index);

                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`relative w-10 h-10 border border-gray-300 text-center flex items-center justify-center ${
                        isBlack ? 'bg-gray-800' : 'bg-white'
                      } ${!isBlack ? getCellStyle(index) : ''}`}
                    >
                      {!isBlack && (
                        <input
                          id={`cell-${index}`}
                          maxLength="1"
                          value={reveal ? correctLetter : gridLetters[index]}
                          onChange={(e) => handleInputChange(index, e.target.value)}
                          disabled={reveal}
                          className={`w-full h-full text-center font-bold text-lg focus:outline-none uppercase ${
                            reveal ? 'text-gray-400' : 'text-black'
                          }`}
                        />
                      )}
                      {!isBlack && number && (
                        <span className="absolute text-[10px] top-0 left-0 ml-1 mt-0.5 text-gray-600">{number}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Clues:</h2>
              <ul className="list-disc ml-5 space-y-2 mb-4">
                {clues.map((clue, index) => (
                  <li
                    key={clue.number}
                    className={`${clue.color} cursor-pointer hover:underline`}
                    onClick={() => setSelectedClueIndex(index)}
                  >
                    <strong>{clue.number}.</strong> {clue.hint}
                    {selectedClueIndex === index && (
                      <span className="ml-2 text-sm text-purple-500">[Selected]</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
