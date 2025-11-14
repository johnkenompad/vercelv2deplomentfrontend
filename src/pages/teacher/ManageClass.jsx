/* --------------------------------------------------------------------------  
   ManageClass.jsx – Teacher Class Management
   • Create and manage classes
   • Add/remove students from classes
   • View class rosters
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  where,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../../firebase";
import Sidebar from "../../components/Sidebar";
import TeacherTopNavBar from "../../components/TeacherTopNavBar";
import { motion } from "framer-motion";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  UserPlus, 
  X,
  Search,
  Check
} from "lucide-react";

export default function ManageClass() {
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true"
  );

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const navigate = useNavigate();
  const auth = getAuth();
  const [teacherId, setTeacherId] = useState(null);

  /* ─────────────────────────────── Auth listener */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setTeacherId(user.uid);
      } else {
        navigate("/login");
      }
    });
    return () => unsub();
  }, [auth, navigate]);

  /* ─────────────────────────────── Fetch classes */
  useEffect(() => {
    if (!teacherId) return;
    fetchClasses();
    fetchStudents();
  }, [teacherId]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const classesRef = collection(db, "classes");
      const q = query(classesRef, where("teacherId", "==", teacherId));
      const snapshot = await getDocs(q);
      
      const classesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setClasses(classesData);
    } catch (error) {
      console.error("Error fetching classes:", error);
      alert("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "student"));
      const snapshot = await getDocs(q);
      
      const studentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  /* ─────────────────────────────── Create Class */
  const handleCreateClass = async (e) => {
    e.preventDefault();
    
    if (!newClassName.trim()) {
      alert("Please enter a class name");
      return;
    }

    try {
      await addDoc(collection(db, "classes"), {
        name: newClassName,
        description: newClassDescription,
        teacherId: teacherId,
        students: [],
        createdAt: serverTimestamp(),
      });

      setNewClassName("");
      setNewClassDescription("");
      setShowCreateModal(false);
      fetchClasses();
      alert("Class created successfully!");
    } catch (error) {
      console.error("Error creating class:", error);
      alert("Failed to create class");
    }
  };

  /* ─────────────────────────────── Delete Class */
  const handleDeleteClass = async (classId) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;

    try {
      await deleteDoc(doc(db, "classes", classId));
      fetchClasses();
      alert("Class deleted successfully!");
    } catch (error) {
      console.error("Error deleting class:", error);
      alert("Failed to delete class");
    }
  };

  /* ─────────────────────────────── Add Student to Class */
  const handleAddStudentToClass = async (studentId) => {
    if (!selectedClass) return;

    try {
      const classRef = doc(db, "classes", selectedClass.id);
      const updatedStudents = [...(selectedClass.students || []), studentId];
      
      await updateDoc(classRef, {
        students: updatedStudents,
      });

      fetchClasses();
      setShowAddStudentModal(false);
      setSelectedClass(null);
      alert("Student added to class!");
    } catch (error) {
      console.error("Error adding student:", error);
      alert("Failed to add student to class");
    }
  };

  /* ─────────────────────────────── Remove Student from Class */
  const handleRemoveStudentFromClass = async (classId, studentId) => {
    if (!window.confirm("Remove this student from the class?")) return;

    try {
      const classData = classes.find(c => c.id === classId);
      const classRef = doc(db, "classes", classId);
      const updatedStudents = (classData.students || []).filter(id => id !== studentId);
      
      await updateDoc(classRef, {
        students: updatedStudents,
      });

      fetchClasses();
      alert("Student removed from class!");
    } catch (error) {
      console.error("Error removing student:", error);
      alert("Failed to remove student from class");
    }
  };

  /* ─────────────────────────────── Helpers */
  const handleProfile = () => navigate("/teacher/profile");
  const handleLogout = () => signOut(auth).then(() => navigate("/"));

  const getStudentInfo = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? {
      name: student.displayName || student.name || student.email || "Unknown",
      email: student.email || ""
    } : { name: "Unknown Student", email: "" };
  };

  const filteredStudents = students.filter(student => {
    const name = (student.displayName || student.name || "").toLowerCase();
    const email = (student.email || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    
    // Don't show students already in the selected class
    if (selectedClass && selectedClass.students?.includes(student.id)) {
      return false;
    }
    
    return name.includes(search) || email.includes(search);
  });

  /* ─────────────────────────────── Render */
  return (
    <>
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
          {/* Header */}
          <header className="px-10 pt-8 pb-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#3A3A3A]">Manage Classes</h1>
              <p className="text-sm text-[#666666] mt-1">
                Create and organize your student classes
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-[#3399FF] text-white px-4 py-2.5 rounded-lg hover:bg-[#2785E3] transition shadow"
            >
              <Plus size={20} />
              Create Class
            </button>
          </header>

          {/* Classes Grid */}
          <div className="px-10 pb-10">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3399FF]"></div>
              </div>
            ) : classes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <Users size={64} className="mx-auto text-[#CCCCCC] mb-4" />
                <h3 className="text-xl font-semibold text-[#666666] mb-2">
                  No classes yet
                </h3>
                <p className="text-[#999999] mb-6">
                  Create your first class to start organizing students
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-[#3399FF] text-white px-6 py-3 rounded-lg hover:bg-[#2785E3] transition"
                >
                  Create Your First Class
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((classItem, idx) => (
                  <motion.div
                    key={classItem.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-xl shadow-md border border-[#DDDDDD] overflow-hidden"
                  >
                    {/* Class Header */}
                    <div className="bg-gradient-to-r from-[#3399FF] to-[#2785E3] p-4 text-white">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold">{classItem.name}</h3>
                        <button
                          onClick={() => handleDeleteClass(classItem.id)}
                          className="text-white/80 hover:text-white transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      {classItem.description && (
                        <p className="text-sm text-white/90">{classItem.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3 text-sm">
                        <Users size={16} />
                        <span>{classItem.students?.length || 0} students</span>
                      </div>
                    </div>

                    {/* Students List */}
                    <div className="p-4">
                      {classItem.students && classItem.students.length > 0 ? (
                        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                          {classItem.students.map((studentId) => {
                            const studentInfo = getStudentInfo(studentId);
                            return (
                              <div
                                key={studentId}
                                className="flex justify-between items-center bg-[#F3F8FC] p-2 rounded"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#333333] truncate">
                                    {studentInfo.name}
                                  </p>
                                  <p className="text-xs text-[#666666] truncate">
                                    {studentInfo.email}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveStudentFromClass(classItem.id, studentId)}
                                  className="text-red-500 hover:text-red-700 transition ml-2"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-[#999999] text-center py-4">
                          No students in this class yet
                        </p>
                      )}

                      <button
                        onClick={() => {
                          setSelectedClass(classItem);
                          setShowAddStudentModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-[#E8F6FF] text-[#3399FF] px-4 py-2 rounded-lg hover:bg-[#D9F0FF] transition border border-[#3399FF]/20"
                      >
                        <UserPlus size={18} />
                        Add Students
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-bold text-[#333333] mb-4">Create New Class</h2>
            <form onSubmit={handleCreateClass}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-[#333333] mb-2">
                  Class Name *
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full border border-[#DDDDDD] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3399FF]"
                  placeholder="e.g., Grade 7 Math"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#333333] mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                  className="w-full border border-[#DDDDDD] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3399FF]"
                  placeholder="Class description or notes"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewClassName("");
                    setNewClassDescription("");
                  }}
                  className="flex-1 bg-gray-200 text-[#333333] px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#3399FF] text-white px-4 py-2 rounded-lg hover:bg-[#2785E3] transition"
                >
                  Create Class
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col"
          >
            <h2 className="text-xl font-bold text-[#333333] mb-4">
              Add Students to {selectedClass.name}
            </h2>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#999999]" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-[#DDDDDD] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3399FF]"
                  placeholder="Search students by name or email..."
                />
              </div>
            </div>

            {/* Students List */}
            <div className="flex-1 overflow-y-auto mb-4 border border-[#DDDDDD] rounded-lg">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-[#999999]">
                  {searchTerm ? "No students found" : "No available students"}
                </div>
              ) : (
                <div className="divide-y divide-[#EEEEEE]">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-3 hover:bg-[#F3F8FC] transition cursor-pointer flex justify-between items-center"
                      onClick={() => handleAddStudentToClass(student.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#333333] truncate">
                          {student.displayName || student.name || "Unknown"}
                        </p>
                        <p className="text-xs text-[#666666] truncate">
                          {student.email}
                        </p>
                      </div>
                      <button className="text-[#3399FF] hover:text-[#2785E3] transition ml-2">
                        <Plus size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowAddStudentModal(false);
                setSelectedClass(null);
                setSearchTerm("");
              }}
              className="w-full bg-gray-200 text-[#333333] px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
