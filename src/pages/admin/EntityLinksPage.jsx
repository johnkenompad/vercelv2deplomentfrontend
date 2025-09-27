import React, { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";

const EntityLinksPage = () => {
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  const relationships = [
    {
      parent: "Users",
      relation: "1 → N",
      child: "Quizzes",
      key: "userId → teacherId",
      description: "A teacher (user) can create multiple quizzes."
    },
    {
      parent: "Quizzes",
      relation: "1 → N",
      child: "Questions",
      key: "quizId → quizId",
      description: "Each quiz contains multiple questions."
    },
    {
      parent: "Quizzes",
      relation: "M → N",
      child: "Users (Students)",
      key: "quizzes/[quizId]/assignedTo/[userId]",
      description: "A quiz can be assigned to multiple students via subcollection."
    },
    {
      parent: "Users (Students)",
      relation: "1 → N",
      child: "Results",
      key: "userId → studentId",
      description: "Each student can have multiple quiz result records."
    },
    {
      parent: "Results",
      relation: "1 → 1",
      child: "Quizzes",
      key: "quizId → quizId",
      description: "Each result is linked to one specific quiz."
    }
  ];

  return (
    <div className="flex min-h-screen bg-[#F6EFFC]">
      <AdminSidebar
        minimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
      />

      <main
        className={`flex-1 p-6 transition-all duration-300 ${
          sidebarMinimized ? "ml-[72px]" : "ml-[240px]"
        }`}
      >
        {/* Header */}
        <h1 className="text-3xl font-bold text-[#5C517B] mb-2 flex items-center gap-2">
          <span>🔗</span> Entity Links
        </h1>
        <p className="text-gray-700 mb-6 max-w-3xl">
          This page summarizes how core entities in QuizRush relate to each other, useful for database design, debugging, and future analytics.
        </p>

        {/* Table */}
        <div className="overflow-auto rounded shadow-lg border border-gray-200 bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#B76EF1] text-white">
              <tr>
                <th className="px-4 py-3">Parent Entity</th>
                <th className="px-4 py-3">Relationship</th>
                <th className="px-4 py-3">Child Entity</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {relationships.map((rel, index) => (
                <tr key={index} className="hover:bg-purple-50">
                  <td className="px-4 py-2 font-medium">{rel.parent}</td>
                  <td className="px-4 py-2 text-center">{rel.relation}</td>
                  <td className="px-4 py-2">{rel.child}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{rel.key}</td>
                  <td className="px-4 py-2">{rel.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Diagram Image */}
        <div className="mt-10 p-6 bg-white rounded-lg shadow border border-gray-200">
          <h2 className="text-xl font-semibold text-[#5C517B] mb-2">
            📊 Visual Entity Diagram
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            This diagram helps visualize how core entities in QuizRush are connected in Firestore.
          </p>
          <div className="overflow-x-auto">
            <img
              src="/entity_relationship.png"
              alt="Entity Relationship Diagram"
              className="w-full max-w-4xl border rounded shadow"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default EntityLinksPage;
