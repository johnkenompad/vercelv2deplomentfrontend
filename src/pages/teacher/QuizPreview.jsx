import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Sidebar from '../../components/Sidebar';

export default function QuizPreview() {
  const { id: quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [sidebarMinimized, setSidebarMinimized] = useState(() => localStorage.getItem('sidebarMinimized') === 'true');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        const quizRef = doc(db, 'quizzes', quizId);
        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists()) {
          console.error('❌ Quiz not found');
          return;
        }

        const quizData = quizSnap.data();
        setQuiz(quizData);
      } catch (error) {
        console.error('❌ Failed to fetch quiz:', error);
      }
    };

    fetchQuizData();
  }, [quizId]);

  if (!quiz) {
    return <div className="p-6 text-gray-600">Loading quiz...</div>;
  }

  const questions = quiz.questions || [];
  const mcQuestions = questions.filter(q => q.question_type === 'mc');
  const tfQuestions = questions.filter(q => q.question_type === 'tf');

  return (
    <div className="flex h-screen bg-[#F6EFFC] text-[#5C517B]">
      <Sidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />

      <div className={`flex-1 transition-all duration-300 overflow-y-auto p-8 ${sidebarMinimized ? 'ml-20' : 'ml-64'}`}>
        <button
          onClick={() => navigate(-1)}
          className="mb-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
        >
          ← Back
        </button>

        <div className="bg-white p-6 rounded shadow-md border border-[#EBD3FA]">
          <h1 className="text-2xl font-bold mb-2 text-[#B76EF1]">🧠 {quiz.title}</h1>
          <p className="text-sm text-[#5C517B]/70 mb-6">Difficulty: {quiz.difficulty}</p>

          {questions.length === 0 ? (
            <p className="text-gray-500">No questions found for this quiz.</p>
          ) : (
            <div className="space-y-10">

              {/* MULTIPLE CHOICE SECTION */}
              {mcQuestions.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-purple-700 mb-4">📘 Multiple Choice Questions</h2>
                  <div className="space-y-6">
                    {mcQuestions.map((q, index) => (
                      <div key={index} className="p-4 border rounded bg-gray-50">
                        <p className="font-semibold text-lg mb-2">
                          {index + 1}. {q.question}
                        </p>
                        <ul className="ml-4 list-disc text-sm text-gray-700">
                          {q.options.map((opt, idx) => (
                            <li key={idx}>{opt}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-sm text-green-700">
                          <strong>Correct Answer:</strong> {q.answer}
                        </p>
                        {q.explanation && (
                          <p className="mt-2 text-xs text-purple-700">
                            💡 Explanation: {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TRUE OR FALSE SECTION */}
              {tfQuestions.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-purple-700 mb-4">📕 True or False Questions</h2>
                  <div className="space-y-6">
                    {tfQuestions.map((q, index) => (
                      <div key={index} className="p-4 border rounded bg-gray-50">
                        <p className="font-semibold text-lg mb-2">
                          {mcQuestions.length + index + 1}. {q.question}
                        </p>
                        <p className="text-sm text-green-700">
                          <strong>Correct Answer:</strong> {q.answer}
                        </p>
                        {q.explanation && (
                          <p className="mt-2 text-xs text-purple-700">
                            💡 Explanation: {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
