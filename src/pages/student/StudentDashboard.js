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

export default function StudentDashboard() {
  const [role, setRole] = useState('');
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  const [takenQuizIds, setTakenQuizIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarMinimized, setSidebarMinimized] = useState(() => localStorage.getItem('sidebarMinimized') === 'true');
  const [averageScore, setAverageScore] = useState('N/A');
  const navigate = useNavigate();

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setRole(storedRole.charAt(0).toUpperCase() + storedRole.slice(1));
    }

    const fetchData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const quizzesSnap = await getDocs(collection(db, 'quizzes'));
        const filtered = [];

        for (const quizDoc of quizzesSnap.docs) {
          const assignedRef = doc(db, 'quizzes', quizDoc.id, 'assignedTo', user.uid);
          const assignedSnap = await getDoc(assignedRef);

          if (assignedSnap.exists()) {
            const quizData = quizDoc.data();
            const assignedData = assignedSnap.data();

            filtered.push({
              id: quizDoc.id,
              ...quizData,
              assignedAt: assignedData.assignedAt?.toDate()?.toLocaleDateString() || 'No date'
            });
          }
        }

        const resultsSnapshot = await getDocs(collection(db, `users/${user.uid}/results`));
        const scores = [];
        const takenIds = [];

        resultsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (typeof data.score === 'number' && typeof data.total === 'number') {
            scores.push({ score: data.score, total: data.total });
            takenIds.push(doc.id);
          }
        });

        setTakenQuizIds(takenIds);

        const totalScore = scores.reduce((acc, curr) => acc + curr.score, 0);
        const totalPossible = scores.reduce((acc, curr) => acc + curr.total, 0);
        const avg = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(1) : 'N/A';

        setAssignedQuizzes(filtered);
        setAverageScore(avg);
      } catch (err) {
        console.error('🔥 Error fetching dashboard data:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex h-screen bg-[#F6EFFC] text-[#5C517B]">
      <StudentSidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />

      <div className={`flex-1 transition-all duration-300 overflow-y-auto p-10 ${sidebarMinimized ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#B76EF1]">📚 Student Dashboard</h1>
          <div className="flex gap-4 text-xl text-[#974EC3]">
            <div title="Messages">💬</div>
            <div title="Notifications">🔔</div>
            <div title="Profile">👤</div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="flex gap-6 flex-wrap mb-8">
          <div className="flex-1 min-w-[200px] bg-white rounded-lg shadow border border-[#EBD3FA] p-6 text-center">
            <p className="text-[#5C517B]/80">Quizzes Assigned</p>
            <h2 className="text-[#B76EF1] text-3xl font-semibold">{assignedQuizzes.length}</h2>
          </div>
          <div className="flex-1 min-w-[200px] bg-white rounded-lg shadow border border-[#EBD3FA] p-6 text-center">
            <p className="text-[#5C517B]/80">Quizzes Taken</p>
            <h2 className="text-[#B76EF1] text-3xl font-semibold">{takenQuizIds.length}</h2>
          </div>
          <div className="flex-1 min-w-[200px] bg-white rounded-lg shadow border border-[#EBD3FA] p-6 text-center">
            <p className="text-[#5C517B]/80">Average Score</p>
            <h2 className="text-[#B76EF1] text-3xl font-semibold">
              {averageScore !== 'N/A' ? `${averageScore}%` : 'No quizzes taken yet'}
            </h2>
          </div>
        </div>

        {/* Assigned Quizzes */}
        <div className="bg-white p-6 rounded-lg shadow border border-[#EBD3FA]">
          <h2 className="text-xl font-semibold mb-4 text-[#5C517B]">📝 Your Assigned Quizzes</h2>
          {isLoading ? (
            <p className="text-[#5C517B]/70">⏳ Loading assigned quizzes...</p>
          ) : assignedQuizzes.length === 0 ? (
            <p className="text-[#5C517B]/70">No quizzes assigned yet.</p>
          ) : (
            <div className="divide-y divide-gray-300">
              {assignedQuizzes.map((quiz) => (
                <div key={quiz.id} className="flex justify-between items-center py-4">
                  <div>
                    <h3 className="text-lg font-semibold">{quiz.title}</h3>
                    <p className="text-sm text-[#5C517B]/70">Due: {quiz.assignedAt}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => navigate('/take-quiz', { state: { quizId: quiz.id } })}
                      className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition"
                    >
                      Start Quiz
                    </button>
                    {takenQuizIds.includes(quiz.id) ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 text-sm rounded">
                        Completed
                      </span>
                    ) : (
                      <span className="bg-gray-200 text-gray-600 px-3 py-1 text-sm rounded">
                        Not Yet Taken
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
