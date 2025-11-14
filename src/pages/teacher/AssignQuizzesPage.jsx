/* --------------------------------------------------------------------------  
   AssignQuizPage.jsx – vivid-blue Teacher UI  
   • Uses shared <TeacherTopNavBar> component  
   • Sidebar-aware padding (88 px ⇆ 256 px)  
   • Palette: #3399FF accent, #2785E3 hover, #333333 headers, #DDDDDD borders  
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  addDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import Sidebar from "../../components/Sidebar";
import TeacherTopNavBar from "../../components/TeacherTopNavBar";

export default function AssignQuizPage() {
  /* ─────────────────────────────── State */
  const [quizzes, setQuizzes]           = useState([]);
  const [students, setStudents]         = useState([]);
  const [classes, setClasses]           = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [selectedStudents, setSelStuds] = useState([]);
  const [selectedClasses, setSelClasses] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState("students"); // "students" or "classes"
  const [deadline, setDeadline]         = useState("");
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );

  const navigate = useNavigate();
  const auth     = getAuth();

  /* ─────────────────────────────── Auth guard */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login");
    });
    return () => unsub();
  }, [auth, navigate]);

  /* ─────────────────────────────── Fetch quizzes & students */
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      /* AI quizzes (legacy) */
      const aiQ = query(
        collection(db, "quizzes"),
        where("created_by", "==", user.uid),
      );

      /* Manual / new AI quizzes */
      const newQ = query(
        collection(db, "quizzes"),
        where("createdBy", "==", user.uid),
      );

      /* Students */
      const studQ = query(
        collection(db, "users"),
        where("role", "==", "student"),
      );

      /* Classes */
      const classQ = query(
        collection(db, "classes"),
        where("teacherId", "==", user.uid),
      );

      const [aiSnap, newSnap, studSnap, classSnap] = await Promise.all([
        getDocs(aiQ),
        getDocs(newQ),
        getDocs(studQ),
        getDocs(classQ),
      ]);

      /* Merge quizzes */
      const quizMap = new Map();
      aiSnap.docs.forEach((d) => quizMap.set(d.id, { id: d.id, ...d.data() }));
      newSnap.docs.forEach((d) => quizMap.set(d.id, { id: d.id, ...d.data() }));

      setQuizzes(Array.from(quizMap.values()));
      setStudents(studSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchData();
  }, [auth]);

  /* Persist sidebar pref */
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", sidebarMinimized);
  }, [sidebarMinimized]);

  /* ─────────────────────────────── Handlers */
  const toggleAll = (e) => {
    setSelStuds(e.target.checked ? students.map((s) => s.id) : []);
  };
  const toggleStudent = (id) => {
    setSelStuds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const toggleAllClasses = (e) => {
    setSelClasses(e.target.checked ? classes.map((c) => c.id) : []);
  };
  const toggleClass = (id) => {
    setSelClasses((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id],
    );
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    
    // Collect all student IDs based on assignment mode
    let allStudentIds = [];
    
    if (assignmentMode === "students") {
      if (selectedStudents.length === 0) {
        alert("❗ Please select at least one student.");
        return;
      }
      allStudentIds = selectedStudents;
    } else {
      // Classes mode
      if (selectedClasses.length === 0) {
        alert("❗ Please select at least one class.");
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
        alert("❗ The selected class(es) have no students.");
        return;
      }
    }

    if (!selectedQuiz || !deadline) {
      alert("❗ Select a quiz and deadline.");
      return;
    }

    try {
      const quizObj   = quizzes.find((q) => q.id === selectedQuiz);
      const quizTitle = quizObj?.title || "a quiz";

      /* Assignment sub-docs */
      await Promise.all(
        allStudentIds.map((sid) =>
          setDoc(doc(db, `quizzes/${selectedQuiz}/assignedTo/${sid}`), {
            assignedAt: serverTimestamp(),
            studentId : sid,
            deadline  : deadline,
          }),
        ),
      );

      /* Notifications */
      await Promise.all(
        allStudentIds.map((sid) =>
          addDoc(collection(db, "notifications"), {
            userId    : sid,
            message   : `📢 New quiz published: ${quizTitle}`,
            quizId    : selectedQuiz,
            read      : false,
            timestamp : serverTimestamp(),
          }),
        ),
      );

      const assignmentTarget = assignmentMode === "students" 
        ? `${allStudentIds.length} student(s)`
        : `${selectedClasses.length} class(es) (${allStudentIds.length} students)`;
      
      alert(`✅ Quiz published to ${assignmentTarget} and students notified!`);
      setSelStuds([]);
      setSelClasses([]);
      setSelectedQuiz("");
      setDeadline("");
    } catch (err) {
      console.error(err);
      alert("❌ Publish failed.");
    }
  };

  const handleProfile = () => navigate("/profile");
  const handleLogout  = () =>
    signOut(auth).then(() => navigate("/"));

  /* ─────────────────────────────── UI */
  return (
    <>
      {/* Global top bar */}
      <TeacherTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      {/* Layout */}
      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
        <Sidebar
          minimized={sidebarMinimized}
          setSidebarMinimized={(val) => {
            localStorage.setItem("sidebarMinimized", val);
            setSidebarMinimized(val);
          }}
        />

        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarMinimized ? "ml-20" : "ml-64"
          }`}
        >
          {/* Page header */}
          <header className="px-10 pt-8 pb-4">
            <h1 className="text-2xl font-bold text-[#3A3A3A]">
              Publish Quiz to Students
            </h1>
          </header>

          {/* Form card */}
          <form
            onSubmit={handleAssign}
            className="mx-auto max-w-3xl rounded-xl border border-[#DDDDDD] bg-white p-8 shadow"
          >
            {/* Quiz selector */}
            <label className="block text-sm font-semibold">Select Quiz</label>
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              className="mt-1 w-full rounded border border-[#DDDDDD] bg-[#E8F6FF] p-2"
            >
              <option value="">— Choose a quiz —</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} {q.type === "manual" ? "(Manual)" : "(AI)"}
                </option>
              ))}
            </select>

            {/* Assignment Mode Toggle */}
            <div className="mt-6">
              <label className="block text-sm font-semibold mb-2">Assign To</label>
              <div className="flex gap-4 bg-[#F3F8FC] p-3 rounded-lg">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="assignmentMode"
                    value="students"
                    checked={assignmentMode === "students"}
                    onChange={(e) => setAssignmentMode(e.target.value)}
                    className="mr-2 accent-[#3399FF]"
                  />
                  <span className="font-medium">Individual Students</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="assignmentMode"
                    value="classes"
                    checked={assignmentMode === "classes"}
                    onChange={(e) => setAssignmentMode(e.target.value)}
                    className="mr-2 accent-[#3399FF]"
                  />
                  <span className="font-medium">Classes</span>
                </label>
              </div>
            </div>

            {/* Students Selection (shown when mode is "students") */}
            {assignmentMode === "students" && (
              <div className="mt-4">
                <label className="block text-sm font-semibold">
                  Select Students
                </label>
                <div className="mt-1 max-h-40 overflow-y-auto rounded border border-[#DDDDDD] bg-[#F9FCFF] p-3">
                  <label className="mb-2 block">
                    <input
                      type="checkbox"
                      onChange={toggleAll}
                      checked={
                        selectedStudents.length === students.length &&
                        students.length > 0
                      }
                      className="mr-2 accent-[#3399FF]"
                    />
                    <span className="font-medium">Select All</span>
                  </label>
                  {students.length === 0 ? (
                    <p className="text-sm text-[#999999] italic">No students available</p>
                  ) : (
                    students.map((s) => (
                      <label key={s.id} className="block hover:bg-[#E8F6FF] p-1 rounded">
                        <input
                          type="checkbox"
                          value={s.id}
                          checked={selectedStudents.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="mr-2 accent-[#3399FF]"
                        />
                        {s.displayName || s.email}
                      </label>
                    ))
                  )}
                </div>
                {selectedStudents.length > 0 && (
                  <p className="mt-2 text-sm text-[#3399FF]">
                    ✓ {selectedStudents.length} student(s) selected
                  </p>
                )}
              </div>
            )}

            {/* Classes Selection (shown when mode is "classes") */}
            {assignmentMode === "classes" && (
              <div className="mt-4">
                <label className="block text-sm font-semibold">
                  Select Classes
                </label>
                <div className="mt-1 max-h-40 overflow-y-auto rounded border border-[#DDDDDD] bg-[#F9FCFF] p-3">
                  <label className="mb-2 block">
                    <input
                      type="checkbox"
                      onChange={toggleAllClasses}
                      checked={
                        selectedClasses.length === classes.length &&
                        classes.length > 0
                      }
                      className="mr-2 accent-[#3399FF]"
                    />
                    <span className="font-medium">Select All</span>
                  </label>
                  {classes.length === 0 ? (
                    <p className="text-sm text-[#999999] italic">
                      No classes available. <a href="/teacher/manage-class" className="text-[#3399FF] underline">Create one</a>
                    </p>
                  ) : (
                    classes.map((c) => (
                      <label key={c.id} className="block hover:bg-[#E8F6FF] p-2 rounded">
                        <input
                          type="checkbox"
                          value={c.id}
                          checked={selectedClasses.includes(c.id)}
                          onChange={() => toggleClass(c.id)}
                          className="mr-2 accent-[#3399FF]"
                        />
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-2 text-xs text-[#666666]">
                          ({c.students?.length || 0} students)
                        </span>
                        {c.description && (
                          <span className="block ml-6 text-xs text-[#999999]">{c.description}</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
                {selectedClasses.length > 0 && (
                  <p className="mt-2 text-sm text-[#3399FF]">
                    ✓ {selectedClasses.length} class(es) selected
                  </p>
                )}
              </div>
            )}

            {/* Deadline */}
            <label className="mt-4 block text-sm font-semibold">
              Set Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
            />

            {/* Submit */}
            <button
              type="submit"
              className="mt-6 rounded bg-[#3399FF] px-6 py-3 font-semibold text-white transition hover:bg-[#2785E3]"
            >
              🚀 Publish Quiz
            </button>

            <p className="mt-3 text-sm text-[#666666]">
              🎉 Students will be notified once the quiz is published.
            </p>
          </form>
        </main>
      </div>
    </>
  );
}
