import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../../components/StudentSidebar';

export default function AssignedQuizzesPage() {
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sidebarMinimized, setSidebarMinimized] = useState(() => localStorage.getItem('sidebarMinimized') === 'true');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssignedQuizzes = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
        const assigned = [];

        for (const quiz of quizzesSnapshot.docs) {
          const assignedDocRef = doc(db, 'quizzes', quiz.id, 'assignedTo', user.uid);
          const assignedDocSnap = await getDoc(assignedDocRef);

          if (assignedDocSnap.exists()) {
            const quizData = quiz.data();
            const assignedData = assignedDocSnap.data();

            assigned.push({
              id: quiz.id,
              ...quizData,
              assignedAt: assignedData.assignedAt,
            });
          }
        }

        setAssignedQuizzes(assigned);
      } catch (err) {
        console.error('🔥 Error fetching assigned quizzes:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedQuizzes();
  }, []);

  useEffect(() => {
    let filtered = [...assignedQuizzes];

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(
        (quiz) => (quiz.difficulty || '').toLowerCase() === difficultyFilter
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((quiz) => {
        const rawType = quiz.quizType;
        const types = Array.isArray(rawType)
          ? rawType.map((t) => t.toLowerCase())
          : String(rawType).toLowerCase().split(/,\s*/);

        if (typeFilter === 'mixed') return types.includes('mc') && types.includes('tf');
        return types.includes(typeFilter);
      });
    }

    filtered.sort((a, b) => {
      const dateA = a.assignedAt?.toMillis?.() || 0;
      const dateB = b.assignedAt?.toMillis?.() || 0;
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredQuizzes(filtered);
  }, [assignedQuizzes, sortOrder, difficultyFilter, typeFilter]);

  const formatQuizType = (quizType) => {
    const types = Array.isArray(quizType)
      ? quizType
      : String(quizType).split(/,\s*/).map(t => t.toLowerCase());

    const labels = [];
    if (types.includes('mc')) labels.push('Multiple Choice');
    if (types.includes('tf')) labels.push('True or False');
    return labels.length > 0 ? labels.join(' and ') : 'Unknown';
  };

  return (
    <div className="flex h-screen bg-[#F6EFFC] text-[#5C517B]">
      <StudentSidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />

      <div className={`flex-1 transition-all duration-300 overflow-y-auto p-6 ${sidebarMinimized ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <h2 className="text-3xl font-bold text-[#B76EF1] mb-2">📁 View Assigned Quizzes</h2>
        <p className="text-[#5C517B]/70 mb-6">View and start the quizzes assigned to you.</p>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-md text-sm shadow-sm"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-md text-sm shadow-sm"
          >
            <option value="all">All Quiz Types</option>
            <option value="mc">Multiple Choice</option>
            <option value="tf">True or False</option>
            <option value="mixed">Mixed</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-md text-sm shadow-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* Assigned Quiz List */}
        <div className="bg-white p-6 rounded-lg shadow max-w-4xl border border-[#EBD3FA]">
          {loading ? (
            <p className="text-[#5C517B]/70">⏳ Loading assigned quizzes...</p>
          ) : filteredQuizzes.length === 0 ? (
            <p className="text-[#5C517B]/70">😶 No quizzes found with current filters.</p>
          ) : (
            <ul className="space-y-4">
              {filteredQuizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="border border-[#EBD3FA] bg-gray-50 p-4 rounded-lg shadow-sm"
                >
                  <h3 className="text-xl font-bold text-[#974EC3]">{quiz.title || 'Untitled Quiz'}</h3>
                  <p className="text-sm text-[#5C517B]/80 mt-1">📅 Due: {quiz.assignedAt?.toDate?.().toLocaleDateString() || 'N/A'}</p>
                  <p className="text-sm text-[#5C517B]/80">🎯 Difficulty: {quiz.difficulty || 'N/A'}</p>
                  <p className="text-sm text-[#5C517B]/80">📘 Type: {formatQuizType(quiz.quizType)}</p>
                  <button
                    onClick={() => navigate(`/quiz/details/${quiz.id}`)}
                    className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
                  >
                    View Details
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
