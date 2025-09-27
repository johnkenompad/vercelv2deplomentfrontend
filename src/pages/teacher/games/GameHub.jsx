import React from 'react';
import Sidebar from '../../../components/Sidebar';
import { useNavigate } from 'react-router-dom';

export default function GameHub() {
  const [sidebarMinimized, setSidebarMinimized] = React.useState(() => localStorage.getItem('sidebarMinimized') === 'true');
  const navigate = useNavigate();

  const games = [
    {
      title: "Word Search",
      description: "Find hidden words in a grid. Fun and educational!",
      path: "/teacher/games/word-search", // ✅ Existing playable word search
    },
    {
      title: "Generate Word Search",
      description: "Use AI to auto-generate a word search puzzle with clues.",
      path: "/teacher/games/generate-wordsearch", // ✅ New AI generator
    },
    {
      title: "Crossword",
      description: "Solve the crossword puzzle using clues.",
      path: "/teacher/games/crossword",
    },
    {
      title: "Matching Game",
      description: "Match pairs of words or concepts. Great for memorization!",
      path: "/teacher/games/matching", // 🔜 Optional future game
    },
  ];

  return (
    <div className={`flex min-h-screen bg-[#F6EFFC] text-[#5C517B] transition-all ${sidebarMinimized ? 'pl-[72px]' : 'pl-[240px]'}`}>
      <Sidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />

      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold mb-1 text-[#B76EF1]">🎮 Game Hub</h1>
          <p className="text-lg mb-6 text-[#5C517B]">Play learning games to improve knowledge while having fun!</p>

          <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
            {games.map((game, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#EBD3FA] rounded-lg shadow hover:shadow-md transition cursor-pointer p-6"
                onClick={() => navigate(game.path)}
              >
                <h3 className="text-xl font-bold text-[#5C517B] mb-2">{game.title}</h3>
                <p className="text-sm text-[#6B7280]">{game.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
