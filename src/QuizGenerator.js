import React, { useState } from 'react';
import axios from 'axios';

function QuizGenerator() {
  const [inputText, setInputText] = useState('');
  const [quiz, setQuiz] = useState([]);

  const handleGenerateQuiz = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/generate-quiz', {
        text: inputText,
      });

      setQuiz(response.data.questions);
    } catch (error) {
      console.error('❌ Error generating quiz:', error.response?.data || error.message);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">🧠 Quiz Generator</h1>

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Enter your text here..."
        className="w-full p-2 border rounded mb-4"
        rows={6}
      />

      <button onClick={handleGenerateQuiz} className="bg-blue-500 text-white px-4 py-2 rounded">
        Generate Quiz
      </button>

      {quiz.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Generated Questions:</h2>
          <ul className="list-disc ml-6 mt-2">
            {quiz.map((q, index) => (
              <li key={index}>
                <p className="font-medium">{q.question}</p>
                <ul className="list-decimal ml-6">
                  {q.options.map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
                <p className="text-green-600">Answer: {q.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default QuizGenerator;
