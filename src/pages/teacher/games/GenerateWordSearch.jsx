import React, { useState } from "react";
import axios from "axios";
import { db } from "../../../firebase"; // 🔁 adjust path if different
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

function GenerateWordSearch() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setGenerated(null);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("words", text);
    if (file) formData.append("file", file);

    try {
      const res = await axios.post("/api/wordsearch/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setGenerated(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generated) return;
    try {
      await addDoc(collection(db, "wordsearch_quizzes"), {
        title: generated.title,
        questions: generated.questions,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      alert("Saved to Firestore!");
    } catch (err) {
      console.error("Firestore save error:", err);
      alert("Failed to save.");
    }
  };

  return (
    <div className="p-6 bg-[#F6EFFC] min-h-screen">
      <h2 className="text-2xl font-bold text-[#5C517B] mb-4">🎯 Generate Word Search Quiz</h2>

      <form onSubmit={handleGenerate} className="space-y-4 bg-white p-6 rounded shadow max-w-3xl">
        <input
          type="text"
          placeholder="Quiz Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border rounded p-2"
        />

        <textarea
          rows={6}
          placeholder="Optional: Type or paste content..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border rounded p-2"
        />

        <input
          type="file"
          accept=".docx,.jpg,.jpeg,.png"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-[#B76EF1] text-white px-4 py-2 rounded hover:bg-[#974EC3]"
        >
          {loading ? "Generating..." : "Generate Word Search"}
        </button>
      </form>

      {generated && (
        <div className="mt-6 bg-white p-6 rounded shadow max-w-3xl">
          <h3 className="text-xl font-bold text-[#5C517B] mb-2">{generated.title}</h3>
          <p className="text-sm text-gray-600 mb-2">Identification Questions:</p>

          <ol className="list-decimal pl-6 space-y-1 text-[#333]">
            {generated.questions.map((q, idx) => (
              <li key={idx}>
                {q.question} <span className="text-sm text-gray-500 ml-2">[Answer: {q.answer}]</span>
              </li>
            ))}
          </ol>

          <button
            onClick={handleSave}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Save to Firestore
          </button>

          {saved && (
            <p className="text-green-600 mt-2">✅ Successfully saved to Firestore!</p>
          )}
        </div>
      )}
    </div>
  );
}

export default GenerateWordSearch;
