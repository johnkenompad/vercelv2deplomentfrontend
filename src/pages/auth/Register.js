/* --------------------------------------------------------------------------
   Register.jsx – Role-first flow (Student / Teacher) with Teacher Info
---------------------------------------------------------------------------*/
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";

const Register = () => {
  /* ───────────────────────────── State */
  const [form, setForm] = useState({
    /* Personal */
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    birthdate: "",
    gender: "",
    landline: "",
    mobile: "",
    facebook: "",
    /* Account */
    email: "",
    password: "",
    /* Student Academic */
    studentId: "",
    college: "",
    course: "",
    yearLevel: "",
    classification: "",
    /* Teacher Professional */
    employeeId: "",
    department: "",
    position: "",
    subjectsTaught: "",
    academicLevel: "",
    teachingExperience: "",
    officeRoom: "",
    /* Role */
    role: "student",
  });
  const [selectedRole, setSelectedRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const db = getFirestore();

  /* ───────────────────────────── Handlers */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setForm((prev) => ({ ...prev, role }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { email, password, role, ...userData } = form;

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const userProfile = {
        ...userData,
        email: email.trim(),
        role,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", userCredential.user.uid), userProfile);

      localStorage.setItem("userRole", role);
      navigate(role === "teacher" ? "/dashboard" : "/student-dashboard");
    } catch (err) {
      console.error("❌ Registration Error:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ───────────────────────────── UI */
  if (!selectedRole)
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E8F6FF] via-[#D9F0FF] to-[#CAEAFF] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <h1 className="text-3xl font-extrabold text-[#3399FF] mb-4">
            QuizRush Registration
          </h1>
          <p className="text-gray-600 mb-8">
            Please select your role to continue
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleRoleSelect("student")}
              className="py-3 rounded-xl font-semibold bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] text-white hover:from-[#2A8AEE] hover:to-[#4BA0EE] transform hover:scale-[1.02] active:scale-[0.98]"
            >
              🧑‍🎓 I’m a Student
            </button>
            <button
              onClick={() => handleRoleSelect("teacher")}
              className="py-3 rounded-xl font-semibold bg-gradient-to-r from-[#34C759] to-[#4BD964] text-white hover:from-[#28A745] hover:to-[#3AC15A] transform hover:scale-[1.02] active:scale-[0.98]"
            >
              👨‍🏫 I’m a Teacher
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F6FF] via-[#D9F0FF] to-[#CAEAFF] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg border-b-4 border-[#3399FF] px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl">⚡</span>
                <h1 className="text-3xl font-extrabold text-[#3399FF]">
                  QuizRush
                </h1>
              </div>
              <p className="text-sm text-gray-600 font-medium">
                {selectedRole === "teacher"
                  ? "Teacher Registration Portal"
                  : "Student Registration Portal"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="text-[#3399FF] hover:text-[#2A8AEE] font-semibold underline transition"
            >
              Change Role
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-b-2xl shadow-xl px-8 py-8">
          <form onSubmit={handleRegister} className="space-y-6">
            {/* Personal Information */}
            <div className="bg-gradient-to-r from-[#F0F8FF] to-[#E8F6FF] rounded-xl p-6 border border-[#B8D4F1]">
              <h2 className="text-lg font-bold text-[#3399FF] mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    placeholder="Enter first name"
                  />
                </div>
                {/* Middle Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    name="middleName"
                    value={form.middleName}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    placeholder="Enter middle name"
                  />
                </div>
                {/* Last Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    placeholder="Enter last name"
                  />
                </div>
                {/* Suffix */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Suffix
                  </label>
                  <input
                    type="text"
                    name="suffix"
                    value={form.suffix}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    placeholder="Jr., Sr., III, etc."
                  />
                </div>
                {/* Birthdate */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Birthdate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="birthdate"
                    value={form.birthdate}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                  />
                </div>
                {/* Gender */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {/* Landline */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Landline Number
                  </label>
                  <input
                    type="tel"
                    name="landline"
                    value={form.landline}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    placeholder="(032) XXX XXXX"
                  />
                </div>
                {/* Mobile */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    placeholder="09XX XXX XXXX"
                  />
                </div>
                {/* Facebook */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Facebook Profile
                  </label>
                  <input
                    type="text"
                    name="facebook"
                    value={form.facebook}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    placeholder="Facebook profile link or name"
                  />
                </div>
              </div>
            </div>

            {/* Academic Information – Student only */}
            {selectedRole === "student" && (
              <div className="bg-gradient-to-r from-[#F0F8FF] to-[#E8F6FF] rounded-xl p-6 border border-[#B8D4F1]">
                <h2 className="text-lg font-bold text-[#3399FF] mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                  Academic Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Student ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      value={form.studentId}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="Enter student ID number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      College <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="college"
                      value={form.college}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="e.g., College of Computer Studies"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Course <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="course"
                      value={form.course}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="e.g., BS Information Technology"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Year Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="yearLevel"
                      value={form.yearLevel}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    >
                      <option value="">Select Year Level</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">5th Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Classification <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="classification"
                      value={form.classification}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    >
                      <option value="">Select Classification</option>
                      <option value="Regular">Regular</option>
                      <option value="Irregular">Irregular</option>
                      <option value="Old Student">Old Student</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Professional Information – Teacher only */}
            {selectedRole === "teacher" && (
              <div className="bg-gradient-to-r from-[#F0F8FF] to-[#E8F6FF] rounded-xl p-6 border border-[#B8D4F1]">
                <h2 className="text-lg font-bold text-[#3399FF] mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                  Professional / Academic Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Employee ID */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Employee / Faculty ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="employeeId"
                      value={form.employeeId}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="Enter employee ID"
                    />
                  </div>

                  {/* Department */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Department / College <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="e.g., College of Engineering"
                    />
                  </div>

                  {/* Position */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Position / Rank <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="e.g., Assistant Professor"
                    />
                  </div>

                  {/* Subjects Taught */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Subjects Taught <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="subjectsTaught"
                      value={form.subjectsTaught}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="e.g., Math 101, CS 201"
                    />
                  </div>

                  {/* Academic Level */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Academic Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="academicLevel"
                      value={form.academicLevel}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    >
                      <option value="">Select Level</option>
                      <option value="Undergraduate">Undergraduate</option>
                      <option value="Graduate">Graduate</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>

                  {/* Teaching Experience */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Years of Teaching Experience <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="teachingExperience"
                      value={form.teachingExperience}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      min="0"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="e.g., 5"
                    />
                  </div>

                  {/* Office Room */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Office Room #
                    </label>
                    <input
                      type="text"
                      name="officeRoom"
                      value={form.officeRoom}
                      onChange={handleChange}
                      disabled={loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="e.g., Rm 204-B"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Account Information */}
            <div className="bg-gradient-to-r from-[#F0F8FF] to-[#E8F6FF] rounded-xl p-6 border border-[#B8D4F1]">
              <h2 className="text-lg font-bold text-[#3399FF] mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Account Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="w-full px-4 py-2.5 pr-12 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:border-transparent transition"
                      placeholder="Enter secure password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-[#3399FF] focus:outline-none transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-bold text-base shadow-lg transition-all duration-200 ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] hover:from-[#2A8AEE] hover:to-[#4BA0EE] text-white transform hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Creating Your Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>
            </div>

            {/* Sign-in */}
            <div className="text-center pt-2">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-[#3399FF] hover:text-[#2A8AEE] font-semibold underline transition"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
