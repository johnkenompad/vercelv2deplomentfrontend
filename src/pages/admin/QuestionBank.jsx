import React, { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";

const QuestionBank = () => {
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  const questions = [
    {
      id: "MCQ001",
      question: "What does the 'final' keyword in Java indicate?",
      options: {
        A: "It makes the variable unchangeable",
        B: "It allows method overriding",
        C: "It initializes the variable to zero",
        D: "It creates a new object automatically",
      },
      correctAnswer: "A",
      difficulty: "Easy",
      topic: "Java",
    },
    {
      id: "MCQ002",
      question: "Which HTML tag is used to create a hyperlink?",
      options: {
        A: "<img>",
        B: "<href>",
        C: "<link>",
        D: "<a>",
      },
      correctAnswer: "D",
      difficulty: "Easy",
      topic: "Web Dev",
    },
    {
      id: "MCQ003",
      question: "Which OSI layer handles routing?",
      options: {
        A: "Application",
        B: "Transport",
        C: "Network",
        D: "Data Link",
      },
      correctAnswer: "C",
      difficulty: "Medium",
      topic: "Networking",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F6EFFC]">
      <AdminSidebar
        minimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
      />
      <main
        className={`flex-1 transition-all duration-300 p-10 sm:p-12 ${
          sidebarMinimized ? "ml-20" : "ml-64"
        }`}
      >
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-[#EBD3FA] p-8">
          <h1 className="text-3xl font-extrabold text-[#B76EF1] tracking-tight mb-6">
            📚 Question Bank (Multiple-Choice)
          </h1>

          <div className="overflow-x-auto rounded-lg border border-[#EBD3FA]">
            <table className="min-w-full text-sm text-left text-[#5C517B]">
              <thead className="bg-[#F6EFFC] text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 border border-[#EBD3FA]">ID</th>
                  <th className="px-4 py-3 border border-[#EBD3FA]">Question</th>
                  <th className="px-4 py-3 border border-[#EBD3FA]">A</th>
                  <th className="px-4 py-3 border border-[#EBD3FA]">B</th>
                  <th className="px-4 py-3 border border-[#EBD3FA]">C</th>
                  <th className="px-4 py-3 border border-[#EBD3FA]">D</th>
                  <th className="px-4 py-3 border border-[#EBD3FA]">Answer</th>
                  <th className="px-4 py-3 border border-[#EBD3FA]">Difficulty</th>
                  <th className="px-4 py-3 border border-[#EBD3FA]">Topic</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-[#F6EFFC]/50 transition"
                  >
                    <td className="px-4 py-3 border border-[#EBD3FA] font-medium">
                      {q.id}
                    </td>
                    <td className="px-4 py-3 border border-[#EBD3FA]">
                      {q.question}
                    </td>
                    <td className="px-4 py-3 border border-[#EBD3FA]">
                      {q.options.A}
                    </td>
                    <td className="px-4 py-3 border border-[#EBD3FA]">
                      {q.options.B}
                    </td>
                    <td className="px-4 py-3 border border-[#EBD3FA]">
                      {q.options.C}
                    </td>
                    <td className="px-4 py-3 border border-[#EBD3FA]">
                      {q.options.D}
                    </td>
                    <td className="px-4 py-3 border border-[#EBD3FA] font-semibold text-[#15803d]">
                      {q.correctAnswer}
                    </td>
                    <td className="px-4 py-3 border border-[#EBD3FA]">
                      {q.difficulty}
                    </td>
                    <td className="px-4 py-3 border border-[#EBD3FA]">
                      {q.topic}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuestionBank;