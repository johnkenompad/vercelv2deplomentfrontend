/* --------------------------------------------------------------------------  
   GenerateQuiz.jsx – PRODUCTION-SAFE  
   • Adds strict check for empty/undefined questions before Firestore write  
   • Aligns creator field with Firestore rules (`createdBy`)  
   • Keeps `created_by` for backend compatibility  
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../axiosConfig";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import Sidebar from "../../components/Sidebar";
import TeacherTopNavBar from "../../components/TeacherTopNavBar";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------------------------------------
   Bloom's Taxonomy Validation Helper
------------------------------------------------------------------------------------------------ */
const BLOOMS_TAXONOMY = {
  bt1: {
    name: "Remember (Knowledge)",
    description: "Recall facts and basic concepts",
    verbs: ["define", "list", "name", "identify", "label", "state", "describe", "recall", "recognize", "select", "match", "what", "who", "when", "where"],
    keywords: ["what is", "who is", "when did", "where is", "list", "name"]
  },
  bt2: {
    name: "Understand (Comprehension)",
    description: "Explain ideas or concepts",
    verbs: ["explain", "summarize", "paraphrase", "describe", "interpret", "discuss", "outline", "classify", "compare", "infer", "predict", "why"],
    keywords: ["explain", "why", "summarize", "compare", "what does", "how does"]
  },
  bt3: {
    name: "Apply (Application)",
    description: "Use information in new situations",
    verbs: ["apply", "demonstrate", "solve", "use", "implement", "execute", "calculate", "compute", "construct", "operate", "show how"],
    keywords: ["solve", "calculate", "apply", "demonstrate", "how would you", "use"]
  },
  bt4: {
    name: "Analyze",
    description: "Draw connections among ideas",
    verbs: ["analyze", "differentiate", "distinguish", "examine", "categorize", "compare", "contrast", "investigate", "experiment", "question", "test"],
    keywords: ["analyze", "why does", "what caused", "compare and contrast", "differentiate", "distinguish"]
  },
  bt5: {
    name: "Evaluate",
    description: "Justify a decision or course of action",
    verbs: ["evaluate", "judge", "justify", "critique", "assess", "argue", "defend", "support", "rate", "prioritize", "recommend"],
    keywords: ["evaluate", "judge", "which is better", "justify", "critique", "assess", "should"]
  },
  bt6: {
    name: "Create (Synthesis)",
    description: "Produce new or original work",
    verbs: ["create", "design", "develop", "formulate", "construct", "plan", "produce", "invent", "compose", "generate", "propose"],
    keywords: ["create", "design", "develop", "propose", "how would you create", "what would happen if"]
  }
};

function validateBloomLevel(question, assignedLevel) {
  const lowerQuestion = question.toLowerCase();
  const bloomDef = BLOOMS_TAXONOMY[assignedLevel];
  
  if (!bloomDef) return { valid: false, reason: "Unknown Bloom's level" };
  
  // Check if question contains appropriate verbs/keywords for the assigned level
  const hasMatchingVerb = bloomDef.verbs.some(verb => lowerQuestion.includes(verb));
  const hasMatchingKeyword = bloomDef.keywords.some(keyword => lowerQuestion.includes(keyword));
  
  // Also check if question matches lower levels (warning)
  const lowerLevels = {
    bt2: ["bt1"],
    bt3: ["bt1", "bt2"],
    bt4: ["bt1", "bt2", "bt3"],
    bt5: ["bt1", "bt2", "bt3", "bt4"],
    bt6: ["bt1", "bt2", "bt3", "bt4", "bt5"]
  };
  
  let suggestedLevel = assignedLevel;
  let matchesLowerLevel = false;
  
  if (lowerLevels[assignedLevel]) {
    for (const lowerLevel of lowerLevels[assignedLevel]) {
      const lowerDef = BLOOMS_TAXONOMY[lowerLevel];
      const hasLowerVerb = lowerDef.verbs.some(verb => lowerQuestion.includes(verb));
      const hasLowerKeyword = lowerDef.keywords.some(keyword => lowerQuestion.includes(keyword));
      
      if (hasLowerVerb || hasLowerKeyword) {
        matchesLowerLevel = true;
        suggestedLevel = lowerLevel;
        break;
      }
    }
  }
  
  return {
    valid: hasMatchingVerb || hasMatchingKeyword,
    matchesLowerLevel,
    suggestedLevel,
    assignedLevelName: bloomDef.name,
    suggestedLevelName: BLOOMS_TAXONOMY[suggestedLevel]?.name,
    reason: hasMatchingVerb || hasMatchingKeyword
      ? `Question uses appropriate ${bloomDef.name} verbs`
      : matchesLowerLevel
      ? `Question seems more appropriate for ${BLOOMS_TAXONOMY[suggestedLevel].name}`
      : `Question doesn't clearly match ${bloomDef.name} level indicators`
  };
}

/* ------------------------------------------------------------------------------------------------
   Component
------------------------------------------------------------------------------------------------ */
export default function GenerateQuiz() {
  /* ─────────────────────────────── State */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );

  /* core metadata */
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [quizType, setQuizType] = useState([]);
  const [mcqCount, setMcqCount] = useState("");
  const [tfCount, setTfCount] = useState("");

  /* Bloom's counts */
  const [bloomCounts, setBloomCounts] = useState({
    bt1: 0,
    bt2: 0,
    bt3: 0,
    bt4: 0,
    bt5: 0,
    bt6: 0,
  });

  /* result visibility */
  const [visibleToStudents, setVisibleToStudents] = useState(true);

  /* source text / file */
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState(null);

  /* status */
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [quiz, setQuiz] = useState([]);
  const [bloomValidationReport, setBloomValidationReport] = useState([]);

  const [teacherName, setTeacherName] = useState("Teacher");

  const navigate = useNavigate();
  const auth = getAuth();

  /* ─────────────────────────────── Auth listener */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setTeacherName(u.displayName || u.email?.split("@")[0] || "Teacher");
    });
    return () => unsub();
  }, [auth]);

  /* ─────────────────────────────── Helpers */
  const totalBloom = () =>
    Object.values(bloomCounts).reduce((sum, n) => sum + Number(n || 0), 0);

  const deepClean = (obj) => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj
        .filter((item) => item !== undefined && item !== null)
        .map((item) => deepClean(item));
    }

    const cleaned = {};
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (value !== undefined && value !== null) {
        cleaned[key] = deepClean(value);
      }
    });
    return cleaned;
  };

  /* ─────────────────────────────── Handlers */
  const handleCheckboxChange = (type) =>
    setQuizType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      console.log("Uploading file for text extraction:", selected.name);
      const { data } = await axios.post("/api/extract-text", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Extracted text:", data.text?.substring(0, 100) + "...");
      setInputText(data.text || "");
      toast.success("Text extracted from file successfully!");
    } catch (err) {
      console.error("File extraction error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      let errorMessage = "Failed to extract text from file.";
      if (err.response) {
        errorMessage = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = "Cannot reach the server. Make sure the backend is running.";
      }
      
      toast.error(errorMessage);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleGenerateAndSave = async (e) => {
    e.preventDefault();

    /* basic validation */
    if (!title || !topic.trim() || quizType.length === 0 || (!inputText && !file)) {
      toast.warning("Please fill in Title, Topic, Quiz Type, and Source Text/File.");
      return;
    }
    if (quizType.includes("mc") && !mcqCount) {
      toast.warning("Specify number of MCQ questions.");
      return;
    }
    if (quizType.includes("tf") && !tfCount) {
      toast.warning("Specify number of True/False questions.");
      return;
    }

    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not authenticated");

      /* Check for duplicate quiz title */
      console.log("Checking for duplicate quiz titles...");
      const existingQuizzesSnap = await getDocs(collection(db, "quizzes"));
      const duplicateQuiz = existingQuizzesSnap.docs.find(doc => {
        const quizData = doc.data();
        // Check if quiz with same title exists for this teacher
        return quizData.title?.toLowerCase().trim() === title.toLowerCase().trim() 
               && quizData.createdBy === uid;
      });

      if (duplicateQuiz) {
        toast.error(`A quiz with the title "${title}" already exists. Please use a different title.`);
        setLoading(false);
        return;
      }

      /* clean bloom counts */
      const cleanedBloomCounts = {
        bt1: Number(bloomCounts.bt1) || 0,
        bt2: Number(bloomCounts.bt2) || 0,
        bt3: Number(bloomCounts.bt3) || 0,
        bt4: Number(bloomCounts.bt4) || 0,
        bt5: Number(bloomCounts.bt5) || 0,
        bt6: Number(bloomCounts.bt6) || 0,
      };

      console.log("Sending quiz generation request...");
      console.log("Payload:", {
        text: inputText?.substring(0, 100) + "...",
        quizType,
        mcQuestions: Number(mcqCount) || 0,
        tfQuestions: Number(tfCount) || 0,
        difficulty,
        topic,
        subtopic,
        bloomCounts: cleanedBloomCounts,
      });

      /* 1️⃣  Generate via backend */
      const { data } = await axios.post("/api/generate-quiz", {
        text: inputText || "",
        quizType: quizType || [],
        mcQuestions: Number(mcqCount) || 0,
        tfQuestions: Number(tfCount) || 0,
        difficulty: difficulty || "Easy",
        topic: topic || "",
        subtopic: subtopic || "",
        bloomCounts: cleanedBloomCounts,
        created_by: uid,
      });

      console.log("Backend response:", data);
      console.log("Backend response structure:", JSON.stringify(data, null, 2));

      if (!data) {
        throw new Error("No response received from backend. Please check your connection.");
      }

      // Handle various response formats
      let questionsArray = [];
      if (Array.isArray(data)) {
        questionsArray = data;
      } else if (Array.isArray(data.questions)) {
        questionsArray = data.questions;
      } else if (data.quiz && Array.isArray(data.quiz.questions)) {
        questionsArray = data.quiz.questions;
      } else if (data.data && Array.isArray(data.data.questions)) {
        questionsArray = data.data.questions;
      }

      if (questionsArray.length === 0) {
        throw new Error("Backend returned no questions. Try different input text or parameters.");
      }

      console.log("Questions to validate:", questionsArray);
      console.log("First question structure:", JSON.stringify(questionsArray[0], null, 2));

      /* validate each question */
      const validQuestions = questionsArray.filter((q, idx) => {
        console.log(`\n--- Validating Question ${idx + 1} ---`);
        console.log("Question object:", JSON.stringify(q, null, 2));
        
        if (!q || typeof q !== "object") {
          console.warn(`Question ${idx + 1}: Invalid object structure`);
          return false;
        }
        
        // Check for question text (accept different field names)
        const questionText = q.question || q.text || q.questionText || q.prompt;
        if (!questionText || typeof questionText !== "string" || questionText.trim() === "") {
          console.warn(`Question ${idx + 1}: Missing or invalid question text. Available fields:`, Object.keys(q));
          return false;
        }
        
        // Check for question type (accept different field names and formats)
        const qType = (q.question_type || q.questionType || q.type || "").toLowerCase();
        const normalizedType = qType === "multiple_choice" || qType === "multiplechoice" ? "mc" : 
                               qType === "true_false" || qType === "truefalse" ? "tf" : qType;
        
        if (!["mc", "tf"].includes(normalizedType)) {
          console.warn(`Question ${idx + 1}: Invalid question_type: "${q.question_type || q.questionType || q.type}". Normalized to: "${normalizedType}"`);
          return false;
        }
        
        // Check for bloom level (accept different field names)
        const bloomLevel = q.bloom_level || q.bloomLevel || q.bloom || q.difficulty_level || "bt1";
        if (!bloomLevel) {
          console.warn(`Question ${idx + 1}: Missing bloom_level`);
          return false;
        }

        // 🎯 VALIDATE BLOOM'S TAXONOMY ACCURACY
        const bloomValidation = validateBloomLevel(questionText, bloomLevel);
        console.log(`📊 Bloom's Taxonomy Check for Q${idx + 1}:`, bloomValidation);
        
        if (!bloomValidation.valid) {
          console.warn(`⚠️ Question ${idx + 1} Bloom's Level Mismatch:`, bloomValidation.reason);
          console.warn(`   Assigned: ${bloomValidation.assignedLevelName}`);
          if (bloomValidation.matchesLowerLevel) {
            console.warn(`   Suggested: ${bloomValidation.suggestedLevelName}`);
            console.warn(`   ℹ️ Question: "${questionText}"`);
          }
        } else {
          console.log(`✓ Question ${idx + 1} Bloom's level is appropriate`);
        }

        if (normalizedType === "mc") {
          // Check for options (accept different field names)
          const options = q.options || q.choices || q.answers;
          if (!Array.isArray(options) || options.length === 0) {
            console.warn(`Question ${idx + 1}: Missing or empty options array. Available fields:`, Object.keys(q));
            return false;
          }
          if (options.some((opt) => !opt || (typeof opt !== "string" && typeof opt !== "object") || (typeof opt === "string" && opt.trim() === ""))) {
            console.warn(`Question ${idx + 1}: One or more options are invalid`, options);
            return false;
          }
          
          // Check for correct answer (accept different field names and formats)
          const correctAnswer = q.correct_answer ?? q.correctAnswer ?? q.answer ?? q.correct;
          if (correctAnswer === undefined || correctAnswer === null) {
            console.warn(`Question ${idx + 1}: Missing correct_answer. Available fields:`, Object.keys(q));
            return false;
          }
        } else if (normalizedType === "tf") {
          const correctAnswer = q.correct_answer ?? q.correctAnswer ?? q.answer ?? q.correct;
          if (correctAnswer === undefined || correctAnswer === null) {
            console.warn(`Question ${idx + 1}: Missing correct_answer for T/F`);
            return false;
          }
          // Accept boolean, string "true"/"false", or numbers 1/0
          const isValidTF = typeof correctAnswer === "boolean" || 
                           correctAnswer === "true" || correctAnswer === "false" ||
                           correctAnswer === 1 || correctAnswer === 0 ||
                           correctAnswer === "True" || correctAnswer === "False";
          if (!isValidTF) {
            console.warn(`Question ${idx + 1}: Invalid true/false answer: ${correctAnswer} (type: ${typeof correctAnswer})`);
            return false;
          }
        }
        
        console.log(`✓ Question ${idx + 1} passed validation`);
        return true;
      });

      console.log(`Validation result: ${validQuestions.length} out of ${questionsArray.length} questions are valid`);

      // Generate Bloom's Taxonomy Report
      const bloomReport = validQuestions.map((q, idx) => {
        const questionText = q.question || q.text || q.questionText || q.prompt;
        const bloomLevel = q.bloom_level || q.bloomLevel || q.bloom || q.difficulty_level || "bt1";
        return validateBloomLevel(questionText, bloomLevel);
      });

      const bloomMismatches = bloomReport.filter(r => !r.valid || r.matchesLowerLevel);
      
      if (bloomMismatches.length > 0) {
        console.warn(`\n⚠️ BLOOM'S TAXONOMY VALIDATION SUMMARY:`);
        console.warn(`${bloomMismatches.length} out of ${validQuestions.length} questions may have incorrect Bloom's levels:`);
        bloomMismatches.forEach((mismatch, idx) => {
          console.warn(`  - Question: Assigned ${mismatch.assignedLevelName}, ${mismatch.reason}`);
        });
        
        // Show user-friendly warning
        const mismatchMsg = `\n⚠️ Bloom's Taxonomy Note: ${bloomMismatches.length} question(s) may not match their assigned cognitive level. Check console for details.`;
        console.warn(mismatchMsg);
      } else {
        console.log(`\n✅ All questions appropriately match their assigned Bloom's Taxonomy levels!`);
      }

      if (validQuestions.length === 0)
        throw new Error(`No valid questions generated. Backend returned ${questionsArray.length} questions but all failed validation. Check the console for details.`);

      /* 2️⃣  Prepare data for Firestore */
      const cleanedQuestions = validQuestions.map((q) => {
        // Normalize field names
        const questionText = q.question || q.text || q.questionText || q.prompt;
        const qType = (q.question_type || q.questionType || q.type || "").toLowerCase();
        const normalizedType = qType === "multiple_choice" || qType === "multiplechoice" ? "mc" : 
                               qType === "true_false" || qType === "truefalse" ? "tf" : qType;
        const bloomLevel = q.bloom_level || q.bloomLevel || q.bloom || q.difficulty_level || "bt1";
        
        const cleaned = {
          question: String(questionText).trim(),
          question_type: normalizedType,
          bloom_level: String(bloomLevel),
        };

        if (normalizedType === "mc") {
          const options = q.options || q.choices || q.answers;
          const correctAnswer = q.correct_answer ?? q.correctAnswer ?? q.answer ?? q.correct;
          
          cleaned.correct_answer = Number(correctAnswer) || 0;
          cleaned.options = (options || []).map(opt => {
            // Handle both string options and object options {text: "..."}
            if (typeof opt === "string") return opt.trim();
            if (opt && opt.text) return String(opt.text).trim();
            return String(opt).trim();
          });
        } else {
          // Handle T/F answers
          const correctAnswer = q.correct_answer ?? q.correctAnswer ?? q.answer ?? q.correct;
          if (typeof correctAnswer === "boolean") {
            cleaned.correct_answer = correctAnswer;
          } else if (correctAnswer === 1 || correctAnswer === "1") {
            cleaned.correct_answer = true;
          } else if (correctAnswer === 0 || correctAnswer === "0") {
            cleaned.correct_answer = false;
          } else {
            cleaned.correct_answer = String(correctAnswer).toLowerCase() === "true";
          }
        }
        return deepClean(cleaned);
      });

      /* hard stop if questions array is empty */
      if (!Array.isArray(cleanedQuestions) || cleanedQuestions.length === 0) {
        toast.error("No valid questions available to save. Please try again.");
        setLoading(false);
        return;
      }

      const quizData = deepClean({
        title: String(title),
        topic: String(topic),
        subtopic: String(subtopic),
        difficulty: String(difficulty),
        quizType,
        mcQuestions: Number(mcqCount) || 0,
        tfQuestions: Number(tfCount) || 0,
        bloomCounts: cleanedBloomCounts,
        questions: cleanedQuestions,
        sourceText: String(inputText),
        visibleToStudents: Boolean(visibleToStudents),
        createdAt: serverTimestamp(),
        createdBy: String(uid), // 🔑 aligns with Firestore rules
        created_by: String(uid), // kept for backend consistency
        published: false,
      });

      /* 3️⃣  Save */
      console.log("Saving quiz to Firestore...");
      await addDoc(collection(db, "quizzes"), quizData);

      setQuiz(cleanedQuestions);
      setBloomValidationReport(bloomReport);
      
      // Show success message with Bloom's validation info
      const bloomMismatchCount = bloomReport.filter(r => !r.valid || r.matchesLowerLevel).length;
      if (bloomMismatchCount > 0) {
        toast.success(`✅ Quiz generated & saved! (${cleanedQuestions.length} questions)`, {
          autoClose: 3000,
        });
        toast.warning(`⚠️ ${bloomMismatchCount} question(s) may not perfectly match assigned Bloom's levels. Check console for details.`, {
          autoClose: 5000,
        });
      } else {
        toast.success(`✅ Quiz generated & saved! (${cleanedQuestions.length} questions)\n🎯 All questions match their Bloom's Taxonomy levels!`, {
          autoClose: 4000,
        });
      }

      // navigate('/teacher/quizzes'); // optional
    } catch (err) {
      console.error("Error generating quiz:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          baseURL: err.config?.baseURL,
        }
      });
      
      let errorMessage = "Failed to generate or save quiz.";
      if (err.response) {
        errorMessage = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = "Cannot reach the server. Please check your backend connection.";
      } else {
        errorMessage = err.message || "An unexpected error occurred.";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleProfile = () => navigate("/profile");
  const handleLogout = () => signOut(auth).then(() => navigate("/"));

  /* Preview arrays */
  const multipleChoice = quiz.filter((q) => q.question_type === "mc");
  const trueFalse = quiz.filter((q) => q.question_type === "tf");

  /* ─────────────────────────────── UI */
  return (
    <>
      {/* -------- Global Top Navbar -------- */}
      <TeacherTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

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
          {/* Page title */}
          <header className="px-10 pt-8 pb-4">
            <h1 className="text-2xl font-bold text-[#3A3A3A]">
              Create a New Quiz
            </h1>
          </header>

          {/* -------- Form -------- */}
          <form
            onSubmit={handleGenerateAndSave}
            className="mx-auto max-w-3xl rounded-xl border border-[#DDDDDD] bg-white p-6 shadow"
          >
            {/* Title */}
            <label className="block font-semibold">Quiz Title</label>
            <input
              type="text"
              className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
              placeholder="e.g., Basic Algebra Quiz"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            {/* Topic */}
            <label className="mt-4 block font-semibold">Main Topic</label>
            <input
              type="text"
              className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
              placeholder="e.g., Java Programming"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />

            {/* Subtopic */}
            <label className="mt-4 block font-semibold">
              Sub-topic <span className="text-[#666666]">(optional)</span>
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
              placeholder="e.g., Inheritance & Polymorphism"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
            />

            {/* Difficulty */}
            <label className="mt-4 block font-semibold">Difficulty</label>
            <select
              className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>

            {/* Quiz type */}
            <label className="mt-4 block font-semibold">Quiz Type</label>
            <div className="mt-1 flex gap-6">
              {["mc", "tf"].map((type) => (
                <label key={type} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2 accent-[#3399FF]"
                    checked={quizType.includes(type)}
                    onChange={() => handleCheckboxChange(type)}
                  />
                  {type === "mc" ? "Multiple Choice" : "True / False"}
                </label>
              ))}
            </div>

            {/* Counts */}
            {quizType.includes("mc") && (
              <>
                <label className="mt-4 block font-semibold">
                  # of MCQ Questions
                </label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
                  value={mcqCount}
                  onChange={(e) => setMcqCount(e.target.value)}
                  required
                />
              </>
            )}

            {quizType.includes("tf") && (
              <>
                <label className="mt-4 block font-semibold">
                  # of True / False Questions
                </label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
                  value={tfCount}
                  onChange={(e) => setTfCount(e.target.value)}
                  required
                />
              </>
            )}

            {/* Bloom's Distribution */}
            <label className="mt-6 block font-semibold">
              Bloom's Taxonomy Distribution{" "}
              <span className="text-[#666666]">(per level)</span>
            </label>
            <div className="mb-3 rounded-lg bg-[#E8F6FF] p-3 text-xs text-[#333333]">
              <p className="font-semibold mb-1">📚 Bloom's Taxonomy Guide:</p>
              <ul className="space-y-0.5 ml-4">
                <li><strong>BT1 (Remember):</strong> Define, list, name, identify - recall facts</li>
                <li><strong>BT2 (Understand):</strong> Explain, summarize, describe - explain ideas</li>
                <li><strong>BT3 (Apply):</strong> Solve, calculate, demonstrate - use in new situations</li>
                <li><strong>BT4 (Analyze):</strong> Compare, differentiate, examine - draw connections</li>
                <li><strong>BT5 (Evaluate):</strong> Judge, justify, critique - justify decisions</li>
                <li><strong>BT6 (Create):</strong> Design, develop, propose - produce original work</li>
              </ul>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4">
              {[
                ["bt1", "BT1 – Knowledge"],
                ["bt2", "BT2 – Understand"],
                ["bt3", "BT3 – Apply"],
                ["bt4", "BT4 – Analyze"],
                ["bt5", "BT5 – Evaluate"],
                ["bt6", "BT6 – Create"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
                    value={bloomCounts[key] || 0}
                    onChange={(e) =>
                      setBloomCounts({
                        ...bloomCounts,
                        [key]: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              ))}
            </div>

            {/* Visibility toggle */}
            <div className="mt-4 flex items-center gap-2">
              <input
                id="visibleToggle"
                type="checkbox"
                className="h-4 w-4 accent-[#3399FF]"
                checked={visibleToStudents}
                onChange={(e) => setVisibleToStudents(e.target.checked)}
              />
              <label htmlFor="visibleToggle" className="text-sm font-semibold">
                Allow students to view results
              </label>
            </div>

            {/* Source text */}
            <label className="mt-4 block font-semibold">Enter Source Text</label>
            <textarea
              rows={4}
              className="mt-1 w-full rounded border border-[#DDDDDD] p-2"
              placeholder="Paste topic, paragraph, or notes here…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <p className="mt-2 text-sm text-[#666666]">
              💡 Quiz will be generated from this text or the uploaded file
              below.
            </p>

            {/* File upload */}
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-[#333333]">
                📁 Upload a File (Image / PDF / DOCX)
              </h2>
              <label
                htmlFor="quizFile"
                className="mt-2 flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#3399FF] bg-[#E8F6FF] p-6 text-center transition hover:bg-[#D9F0FF]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mb-2 h-8 w-8 text-[#3399FF]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-sm text-[#333333]">
                  Click to upload or drag &amp; drop
                </span>
                <span className="mt-1 text-xs text-[#666666]">
                  (Accepted: .jpg, .jpeg, .png, .pdf, .docx)
                </span>
                <input
                  id="quizFile"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <p className="mt-2 text-sm text-green-700">
                  📎 {file.name} uploaded
                </p>
              )}
              {ocrLoading && (
                <p className="mt-1 text-sm italic text-[#3399FF]">
                  🔄 Extracting text from file…
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-6 rounded bg-[#3399FF] px-6 py-3 text-white transition hover:bg-[#2785E3]"
              disabled={loading || ocrLoading}
            >
              {loading ? "⏳ Generating…" : "⚡ Generate & Save Quiz"}
            </button>
          </form>

          {/* -------- Preview -------- */}
          {quiz.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto mt-10 max-w-3xl rounded-lg border border-[#DDDDDD] bg-white p-6 shadow"
            >
              {multipleChoice.length > 0 && (
                <>
                  <motion.h3
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="mb-2 text-lg font-bold text-[#3399FF]"
                  >
                    📘 Multiple Choice Questions
                  </motion.h3>
                  <ul className="ml-5 list-disc">
                    {multipleChoice.map((q, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        className="mb-2 text-[#000000]"
                      >
                        <p className="font-medium">{q.question}</p>
                        <ul className="ml-4 list-[square] text-sm">
                          {(q.options || []).map((opt, idx) => (
                            <li key={idx}>{opt}</li>
                          ))}
                        </ul>
                        <div className="mt-1">
                          <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-[#E8F6FF] text-[#3399FF]">
                            {q.bloom_level}
                          </span>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </>
              )}

              {trueFalse.length > 0 && (
                <>
                  <motion.h3
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="mt-6 mb-2 text-lg font-bold text-[#3399FF]"
                  >
                    📗 True / False Questions
                  </motion.h3>
                  <ul className="ml-5 list-disc text-sm">
                    {trueFalse.map((q, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + i * 0.05 }}
                        className="mb-2 text-[#000000]"
                      >
                        {q.question}
                        <div className="mt-1">
                          <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-[#E8F6FF] text-[#3399FF]">
                            {q.bloom_level}
                          </span>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </>
  );
}
