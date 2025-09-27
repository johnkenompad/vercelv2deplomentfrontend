import React, { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../firebase"; // Adjust if your path is different
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

function SavedWordSearchList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const q = query(
          collection(db, "wordsearch_quizzes"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setQuizzes(list);
      } catch (err) {
        console.error("Error fetching quizzes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  return (
    <div className="p-6 bg-[#F6EFFC] min-h-screen">
      <h2 className="text-2xl font-bold text-[#5C517B] mb-4">📚 Saved Word Search Quizzes</h2>

      {loading ? (
        <p className="text-gray-600">Loading quizzes...</p>
      ) : quizzes.length === 0 ? (
        <p className="text-gray-500">No word search quizzes found.</p>
      ) : (
        <div className="bg-white shadow rounded p-4 space-y-4 max-w-3xl">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="border p-4 rounded flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-lg text-[#5C517B]">
                  {quiz.title}
                </h3>
                <p className="text-sm text-gray-500">
                  Created:{" "}
                  {quiz.createdAt?.seconds
                    ? format(new Date(quiz.createdAt.seconds * 1000), "PPPp")
                    : "Unknown"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/teacher/games/preview-wordsearch/${quiz.id}`)}
                  className="bg-[#B76EF1] text-white px-3 py-1 rounded hover:bg-[#974EC3]"
                >
                  Preview
                </button>
                {/* You can add an Assign button later */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SavedWordSearchList;
