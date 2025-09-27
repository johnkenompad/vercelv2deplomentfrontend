// components/WordSearchModal.jsx
import React, { useState } from "react";
import axios from "axios";

export default function WordSearchModal({ onClose, onGenerate }) {
  const [title, setTitle] = useState("");
  const [words, setWords] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", title);
      if (words) formData.append("words", words);
      if (file) formData.append("file", file);

      const res = await axios.post("/api/wordsearch/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onGenerate(res.data); // Send response back to parent
      onClose(); // Close modal
    } catch (err) {
      setError("Generation failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-[480px]">
        <h2 className="text-xl font-bold mb-4">Generate New Word Search</h2>

        <label className="block mb-2 font-medium">Title</label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded mb-4"
          placeholder="e.g., Shrek"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="block mb-2 font-medium">Custom Words (Optional)</label>
        <textarea
          className="w-full px-3 py-2 border rounded mb-4"
          placeholder="One word per line"
          rows={4}
          value={words}
          onChange={(e) => setWords(e.target.value)}
        />

        <label className="block mb-2 font-medium">Upload File (Optional)</label>
        <input
          type="file"
          className="mb-4"
          onChange={(e) => setFile(e.target.files[0])}
        />

        {error && <div className="text-red-500 mb-3">{error}</div>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
