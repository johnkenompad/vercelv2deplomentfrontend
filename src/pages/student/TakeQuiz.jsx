import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import {
  getDocs,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import StudentSidebar from '../../components/StudentSidebar';

export default function TakeQuiz() {
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submittedQuizIds, setSubmittedQuizIds] = useState({});
  const [scores, setScores] = useState({});
  const [sidebarMinimized, setSidebarMinimized] = useState(() =>
    localStorage.getItem('sidebarMinimized') === 'true'
  );

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchAssignedQuizzes = async () => {
      if (!user) return;

      const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
      const assigned = [];

      for (const quiz of quizzesSnapshot.docs) {
        const assignedRef = doc(db, 'quizzes', quiz.id, 'assignedTo', user.uid);
        const assignedSnap = await getDoc(assignedRef);

        if (assignedSnap.exists()) {
          const quizData = quiz.data();
          const resultRef = doc(db, 'users', user.uid, 'results', quiz.id);
          const resultSnap = await getDoc(resultRef);
          const resultData = resultSnap.exists() ? resultSnap.data() : {};
          const attempts = resultData.attempts || 0;

          assigned.push({
            id: quiz.id,
            ...quizData,
            questions: (quizData.questions || []).map((q) => ({
              ...q,
              question_type:
                q.question_type === 'mc'
                  ? 'multiple_choice'
                  : q.question_type === 'tf'
                  ? 'true_false'
                  : q.question_type
            })),
            assignedAt: assignedSnap.data().assignedAt,
            submitted: resultSnap.exists(),
            score: resultData.score || 0,
            attempts
          });
        }
      }

      setAssignedQuizzes(assigned);
    };

    fetchAssignedQuizzes();
  }, [user]);

  const handleChange = (quizId, question, value) => {
    setAnswers(prev => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        [question]: value
      }
    }));
  };

  const handleSubmit = async (quiz) => {
    const selectedAnswers = answers[quiz.id] || {};
    let correct = 0;

    const resultsWithCorrectness = quiz.questions.map((q) => {
      let userAnswer = (selectedAnswers[q.question] || '').trim();

      if (q.question_type === 'multiple_choice') {
        const match = userAnswer.match(/^([A-D])/i);
        if (match) userAnswer = match[1].toUpperCase();
      }

      const correctAnswer = q.answer.trim().toLowerCase();
      const isCorrect = userAnswer.toLowerCase() === correctAnswer;

      if (isCorrect) correct++;
      return { ...q, userAnswer: selectedAnswers[q.question], isCorrect };
    });

    setScores(prev => ({ ...prev, [quiz.id]: correct }));
    setSubmittedQuizIds(prev => ({ ...prev, [quiz.id]: true }));

    const resultRef = doc(db, 'users', user.uid, 'results', quiz.id);
    const attemptCount = (quiz.attempts || 0) + 1;

    await setDoc(resultRef, {
      quizId: quiz.id,
      score: correct,
      total: quiz.questions?.length || 0,
      submittedAt: serverTimestamp(),
      name: user.displayName || user.email || user.uid,
      attempts: attemptCount
    }, { merge: true });

    const orderedAnswersArray = quiz.questions.map(q => ({
      question: q.question,
      answer: selectedAnswers[q.question] || ''
    }));

    const attemptRef = doc(collection(db, 'users', user.uid, 'results', quiz.id, 'attempts'));
    await setDoc(attemptRef, {
      score: correct,
      total: quiz.questions?.length || 0,
      submittedAt: serverTimestamp(),
      answers: orderedAnswersArray
    });

    setAssignedQuizzes(prev =>
      prev.map(q => (q.id === quiz.id
        ? { ...q, questions: resultsWithCorrectness, submitted: true, score: correct, attempts: attemptCount }
        : q))
    );
  };

  const handleRetake = async (quiz) => {
    if (quiz.attempts >= 3) {
      alert('⚠️ You have reached the maximum number of attempts (3).');
      return;
    }

    const confirm = window.confirm("Do you want to retake this quiz?");
    if (!confirm) return;

    setAnswers(prev => {
      const updated = { ...prev };
      delete updated[quiz.id];
      return updated;
    });

    setScores(prev => {
      const updated = { ...prev };
      delete updated[quiz.id];
      return updated;
    });

    setAssignedQuizzes(prev =>
      prev.map(q => (q.id === quiz.id ? { ...q, submitted: false, score: 0 } : q))
    );

    setActiveQuizId(quiz.id);
  };

  return (
    <div className="flex h-screen bg-[#F6EFFC] text-[#5C517B]">
      <StudentSidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />

      <div className={`flex-1 transition-all duration-300 overflow-y-auto p-6 ${sidebarMinimized ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <h1 className="text-3xl font-bold mb-6 text-[#B76EF1]">Take a Quiz</h1>

        {assignedQuizzes.length === 0 ? (
          <p className="text-center text-[#5C517B]/70 text-lg">⏳ Loading assigned quizzes or none found.</p>
        ) : (
          assignedQuizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white p-6 rounded-lg shadow-md border border-[#EBD3FA] mb-6">
              <div className="mb-2">
                <h2 className="text-2xl font-semibold text-[#B76EF1]">{quiz.title}</h2>
                <p className="text-sm text-[#5C517B]/70 mt-1">
                  🗓 Due: {quiz.dueDate || 'N/A'} | 🎯 Difficulty: {quiz.difficulty || 'N/A'} | 📘 Type: {quiz.quizType}
                </p>
              </div>

              {activeQuizId === quiz.id ? (
                <>
                  {!Array.isArray(quiz.questions) || quiz.questions.length === 0 ? (
                    <p className="text-red-500 font-medium mt-4">⚠️ No questions available for this quiz.</p>
                  ) : (
                    <>
                      <div className="mt-4">
                        <h3 className="font-semibold text-lg text-purple-700">📘 Multiple Choice Questions</h3>
                        <p className="text-sm text-[#5C517B]/70 mb-2">Select the correct answer for each question.</p>
                        {quiz.questions.filter(q => q.question_type === 'multiple_choice').map((q, index) => {
                          const userAnswer = answers[quiz.id]?.[q.question];
                          const answerList = q.choices || q.options || [];
                          return (
                            <div key={index} className="mb-4">
                              <p className="mb-1">{index + 1}. {q.question}
                                {quiz.submitted && q.isCorrect !== undefined && (
                                  q.isCorrect ? <span className="text-green-600 ml-2">✅</span> : <span className="text-red-500 ml-2">❌</span>
                                )}
                              </p>
                              {answerList.map((choice, i) => (
                                <label key={i} className="block">
                                  <input
                                    type="radio"
                                    name={`${quiz.id}-${q.question}`}
                                    value={choice}
                                    disabled={quiz.submitted}
                                    checked={userAnswer === choice}
                                    onChange={(e) => handleChange(quiz.id, q.question, e.target.value)}
                                    className="mr-2"
                                  />
                                  {choice}
                                  {quiz.submitted && choice.trim().toLowerCase() === q.answer.trim().toLowerCase() && (
                                    <span className="ml-1 text-green-600 font-medium">(Correct)</span>
                                  )}
                                </label>
                              ))}
                              {quiz.submitted && (
                                <p className="text-sm mt-1 text-[#5C517B]/70">
                                  Correct Answer: <span className="font-semibold text-green-600">{q.answer}</span>
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-6">
                        <h3 className="font-semibold text-lg text-purple-700">📕 True or False Questions</h3>
                        <p className="text-sm text-[#5C517B]/70 mb-2">Type "True" or "False" in the box.</p>
                        {quiz.questions.filter(q => q.question_type === 'true_false').map((q, index) => (
                          <div key={index} className="mb-4">
                            <p className="mb-1">{index + 1}. {q.question}
                              {quiz.submitted && q.isCorrect !== undefined && (
                                q.isCorrect ? <span className="text-green-600 ml-2">✅</span> : <span className="text-red-500 ml-2">❌</span>
                              )}
                            </p>
                            <input
                              type="text"
                              placeholder="True / False"
                              className="w-48 border px-3 py-1 rounded-md mt-1"
                              value={answers[quiz.id]?.[q.question] || ''}
                              disabled={quiz.submitted}
                              onChange={(e) => handleChange(quiz.id, q.question, e.target.value)}
                            />
                            {quiz.submitted && (
                              <p className="text-sm mt-1 text-[#5C517B]/70">
                                Correct Answer: <span className="font-semibold text-green-600">{q.answer}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {quiz.submitted ? (
                    <div className="mt-4 text-green-700 font-semibold">
                      You scored {quiz.score} out of {quiz.questions?.length || 0}.
                    </div>
                  ) : (
                    quiz.questions?.length > 0 && (
                      <button
                        onClick={() => handleSubmit(quiz)}
                        className="bg-[#B76EF1] text-white px-6 py-2 rounded hover:bg-[#974EC3] mt-6"
                      >
                        Submit Quiz
                      </button>
                    )
                  )}
                </>
              ) : (
                <div className="flex flex-wrap gap-3 mt-4 items-center">
                  <button
                    className={`px-4 py-2 rounded text-white ${
                      quiz.submitted ? 'bg-[#B76EF1] cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                    disabled={quiz.submitted}
                    onClick={() => setActiveQuizId(quiz.id)}
                  >
                    {quiz.submitted ? 'Already Submitted' : 'Take Quiz'}
                  </button>

                  {quiz.submitted && (
                    <>
                      <span className="text-sm text-[#5C517B]/70">Attempts: {quiz.attempts || 1} / 3</span>
                      <button
                        className={`px-4 py-2 rounded text-white ${
                          quiz.attempts >= 3
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-[#B76EF1] hover:bg-[#974EC3]'
                        }`}
                        onClick={() => handleRetake(quiz)}
                        disabled={quiz.attempts >= 3}
                      >
                        Retake Quiz
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
