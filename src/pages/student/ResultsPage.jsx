import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import StudentSidebar from '../../components/StudentSidebar';

export default function ResultsPage() {
  const [quizResults, setQuizResults] = useState({});
  const [sidebarMinimized, setSidebarMinimized] = useState(() => localStorage.getItem('sidebarMinimized') === 'true');
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [selectedAttemptId, setSelectedAttemptId] = useState('');

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', sidebarMinimized);
  }, [sidebarMinimized]);

  useEffect(() => {
    const fetchResults = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const resultsRef = collection(db, `users/${user.uid}/results`);
      const quizSnapshots = await getDocs(resultsRef);
      const allResults = {};

      for (const quizDoc of quizSnapshots.docs) {
        const quizId = quizDoc.id;
        const resultData = quizDoc.data();
        let quizTitle = 'Untitled Quiz';

        try {
          const quizDocSnap = await getDoc(doc(db, 'quizzes', quizId));
          if (quizDocSnap.exists()) {
            const quizData = quizDocSnap.data();
            quizTitle = quizData.title || quizTitle;
          }
        } catch (e) {
          console.error('Error fetching quiz title:', e);
        }

        const attemptsRef = collection(db, `users/${user.uid}/results/${quizId}/attempts`);
        const attemptSnapshots = await getDocs(attemptsRef);

        let attempts = [];

        if (!attemptSnapshots.empty) {
          attempts = attemptSnapshots.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            submittedAt: doc.data().submittedAt?.toDate().toLocaleString() || 'Unknown'
          }));
        } else {
          attempts = [{
            id: 'default',
            score: resultData.score,
            total: resultData.total,
            submittedAt: resultData.submittedAt?.toDate().toLocaleString() || 'Unknown'
          }];
        }

        allResults[quizId] = {
          quizTitle,
          attempts
        };
      }

      setQuizResults(allResults);
    };

    fetchResults();
  }, []);

  const selectedQuizData = quizResults[selectedQuiz];
  const selectedAttempt = selectedQuizData?.attempts.find(a => a.id === selectedAttemptId);

  return (
    <div className="flex h-screen bg-[#F6EFFC] text-[#5C517B]">
      <StudentSidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />
      <div className={`flex-1 transition-all duration-300 overflow-y-auto p-10 ${sidebarMinimized ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <h1 className="text-3xl font-bold mb-6 text-[#B76EF1]">📈 Quiz Results</h1>

        <label className="block text-lg mb-2 font-semibold text-[#974EC3]">Select Quiz</label>
        <select
          className="w-full max-w-md p-3 rounded border border-[#EBD3FA] bg-white text-[#5C517B] mb-4"
          value={selectedQuiz}
          onChange={(e) => {
            setSelectedQuiz(e.target.value);
            setSelectedAttemptId('');
          }}
        >
          <option value="">-- Choose a Quiz --</option>
          {Object.entries(quizResults).map(([quizId, data]) => (
            <option key={quizId} value={quizId}>
              {data.quizTitle}
            </option>
          ))}
        </select>

        {selectedQuiz && (
          <>
            <label className="block text-md mb-2 font-semibold text-[#974EC3]">Select Attempt</label>
            <select
              className="w-full max-w-md p-3 rounded border border-[#EBD3FA] bg-white text-[#5C517B] mb-8"
              value={selectedAttemptId}
              onChange={(e) => setSelectedAttemptId(e.target.value)}
            >
              <option value="">-- Choose an Attempt --</option>
              {quizResults[selectedQuiz].attempts.map((a, index) => (
                <option key={a.id} value={a.id}>
                  Attempt {index + 1} - {a.submittedAt}
                </option>
              ))}
            </select>
          </>
        )}

        {selectedAttempt && (
          <div className="bg-white p-6 rounded-xl shadow mb-8 border border-[#EBD3FA]">
            <h2 className="text-xl font-bold mb-2 text-[#5C517B]">Attempt Summary</h2>
            <p className="text-[#B76EF1] text-2xl font-bold mb-1">
              {selectedAttempt.score} out of {selectedAttempt.total} (
              {((selectedAttempt.score / selectedAttempt.total) * 100).toFixed(0)}%)
            </p>
            <p className="text-[#5C517B]/70">
              {selectedAttempt.score === selectedAttempt.total
                ? 'Excellent! You got all answers correct.'
                : 'Good effort! You can improve further.'}
            </p>
            <p className="text-sm text-[#5C517B]/50 mt-2">
              Submitted on: {selectedAttempt.submittedAt}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
