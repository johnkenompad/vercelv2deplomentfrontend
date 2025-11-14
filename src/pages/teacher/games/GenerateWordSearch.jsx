import React, { useState, useEffect } from "react";
import axios from "axios";
import { db } from "../../../firebase"; // 🔁 adjust path if different
import { collection, addDoc, serverTimestamp, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { toast } from "react-toastify";

function GenerateWordSearch() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [saved, setSaved] = useState(false);
  
  // Assignment states
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState("students"); // "students" or "classes"
  const [deadline, setDeadline] = useState("");
  const [showAssignment, setShowAssignment] = useState(false);
  const [savedWordSearchId, setSavedWordSearchId] = useState(null);

  const auth = getAuth();

  // Fetch students and classes
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Fetch students
        const studQ = query(
          collection(db, "users"),
          where("role", "==", "student")
        );

        // Fetch classes for this teacher
        const classQ = query(
          collection(db, "classes"),
          where("teacherId", "==", user.uid)
        );

        const [studSnap, classSnap] = await Promise.all([
          getDocs(studQ),
          getDocs(classQ),
        ]);

        setStudents(studSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching students/classes:", err);
      }
    };
    fetchData();
  }, [auth]);

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
      const user = auth.currentUser;
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const docRef = await addDoc(collection(db, "wordsearch_quizzes"), {
        title: generated.title,
        questions: generated.questions,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        teacherId: user.uid,
      });
      setSaved(true);
      setSavedWordSearchId(docRef.id);
      setShowAssignment(true);
      toast.success("Saved to Firestore! Now you can assign it to students.");
    } catch (err) {
      console.error("Firestore save error:", err);
      toast.error("Failed to save.");
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const toggleAllStudents = (e) => {
    setSelectedStudents(e.target.checked ? students.map((s) => s.id) : []);
  };

  const toggleClass = (id) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const toggleAllClasses = (e) => {
    setSelectedClasses(e.target.checked ? classes.map((c) => c.id) : []);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    
    if (!savedWordSearchId) {
      toast.error("Please save the word search first");
      return;
    }

    // Collect all student IDs based on assignment mode
    let allStudentIds = [];
    
    if (assignmentMode === "students") {
      if (selectedStudents.length === 0) {
        toast.warning("Please select at least one student.");
        return;
      }
      allStudentIds = selectedStudents;
    } else {
      // Classes mode
      if (selectedClasses.length === 0) {
        toast.warning("Please select at least one class.");
        return;
      }
      
      // Get all students from selected classes
      const selectedClassObjects = classes.filter(c => selectedClasses.includes(c.id));
      const studentIdsSet = new Set();
      selectedClassObjects.forEach(classObj => {
        if (classObj.students && Array.isArray(classObj.students)) {
          classObj.students.forEach(sid => studentIdsSet.add(sid));
        }
      });
      allStudentIds = Array.from(studentIdsSet);
      
      if (allStudentIds.length === 0) {
        toast.warning("The selected class(es) have no students.");
        return;
      }
    }

    if (!deadline) {
      toast.warning("Please select a deadline.");
      return;
    }

    try {
      // Assignment sub-docs
      await Promise.all(
        allStudentIds.map((sid) =>
          setDoc(doc(db, `wordsearch_quizzes/${savedWordSearchId}/assignedTo/${sid}`), {
            assignedAt: serverTimestamp(),
            studentId: sid,
            deadline: deadline,
          })
        )
      );

      // Notifications
      await Promise.all(
        allStudentIds.map((sid) =>
          addDoc(collection(db, "notifications"), {
            userId: sid,
            message: `📢 New word search assigned: ${generated.title}`,
            wordSearchId: savedWordSearchId,
            read: false,
            timestamp: serverTimestamp(),
          })
        )
      );

      const assignmentTarget = assignmentMode === "students" 
        ? `${allStudentIds.length} student(s)`
        : `${selectedClasses.length} class(es) (${allStudentIds.length} students)`;
      
      toast.success(`Word search assigned to ${assignmentTarget}!`);
      
      // Reset assignment form
      setSelectedStudents([]);
      setSelectedClasses([]);
      setDeadline("");
      setShowAssignment(false);
    } catch (err) {
      console.error("Assignment error:", err);
      toast.error("Failed to assign word search.");
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
            disabled={saved}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saved ? "✅ Saved" : "Save to Firestore"}
          </button>

          {saved && showAssignment && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-bold text-[#5C517B] mb-4">📤 Assign to Students</h3>
              
              {/* Assignment Mode Toggle */}
              <div className="mb-4 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignmentMode"
                    value="students"
                    checked={assignmentMode === "students"}
                    onChange={(e) => setAssignmentMode(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Assign to Individual Students</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignmentMode"
                    value="classes"
                    checked={assignmentMode === "classes"}
                    onChange={(e) => setAssignmentMode(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Assign to Classes</span>
                </label>
              </div>

              <form onSubmit={handleAssign} className="space-y-4">
                {/* Student Selection */}
                {assignmentMode === "students" && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        onChange={toggleAllStudents}
                        checked={selectedStudents.length === students.length && students.length > 0}
                        className="w-4 h-4"
                      />
                      <label className="text-sm font-semibold">Select All Students</label>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded p-3 space-y-2">
                      {students.length === 0 ? (
                        <p className="text-sm text-gray-500">No students found</p>
                      ) : (
                        students.map((student) => (
                          <label key={student.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => toggleStudent(student.id)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">
                              {student.firstName} {student.lastName} ({student.email})
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Class Selection */}
                {assignmentMode === "classes" && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        onChange={toggleAllClasses}
                        checked={selectedClasses.length === classes.length && classes.length > 0}
                        className="w-4 h-4"
                      />
                      <label className="text-sm font-semibold">Select All Classes</label>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded p-3 space-y-2">
                      {classes.length === 0 ? (
                        <p className="text-sm text-gray-500">No classes found</p>
                      ) : (
                        classes.map((classItem) => (
                          <label key={classItem.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedClasses.includes(classItem.id)}
                              onChange={() => toggleClass(classItem.id)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">
                              {classItem.className} ({classItem.students?.length || 0} students)
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Deadline */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Deadline</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    className="w-full border rounded p-2"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-[#B76EF1] text-white px-4 py-2 rounded hover:bg-[#974EC3]"
                  >
                    Assign Word Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssignment(false)}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GenerateWordSearch;
