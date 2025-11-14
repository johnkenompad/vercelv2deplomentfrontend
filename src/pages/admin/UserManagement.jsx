// src/pages/admin/AdminReports.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
} from "firebase/auth";
import { db, auth } from "../../firebase";
import axios from "axios";
import AdminSidebar from "../../components/AdminSidebar";
import AdminTopNavBar from "../../components/AdminTopNavBar";
import { useNotification } from "../../components/Notification";
import Spinner from "../../components/Spinner";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Filter,
  Users,
  UserPlus,
  Mail,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

/* ─────────────────────────── Component */
export default function AdminReports() {
  /* ─────────────────────────── State */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filteredRole, setFilteredRole] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "student",
    password: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const { showNotification } = useNotification();
  const navigate = useNavigate();

  /* ─────────────────────────── Effects */
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snaps = await getDocs(collection(db, "users"));
      setUsers(snaps.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      showNotification("error", "❌ Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────── Validation */
  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!emailRegex.test(formData.email)) errors.email = "Invalid email";

    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (formData.phone && !phoneRegex.test(formData.phone))
      errors.phone = "Invalid phone";

    if (!selectedUser && !formData.password)
      errors.password = "Password is required";
    else if (formData.password && formData.password.length < 6)
      errors.password = "Password ≥ 6 chars";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ─────────────────────────── Handlers */
  const handleSendResetLink = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification("success", "📩 Reset link sent");
    } catch {
      showNotification("error", "❌ Failed to send reset link");
    }
  };

  const handleStatusToggle = async (id, active) => {
    try {
      await updateDoc(doc(db, "users", id), { active });
      fetchUsers();
      showNotification("success", active ? "✅ Activated" : "🚫 Deactivated");
    } catch {
      showNotification("error", "❌ Failed to update status");
    }
  };

  const openModal = (user) => {
    setSelectedUser(user);
    setFormData(
      user
        ? { ...user, password: "" }
        : {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            role: "student",
            password: "",
          },
    );
    setFormErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showNotification("error", "❌ Fix form errors");
      return;
    }

    const { email, password, ...profile } = formData;
    try {
      if (selectedUser) {
        await updateDoc(doc(db, "users", selectedUser.id), {
          ...profile,
          email,
          updatedAt: serverTimestamp(),
        });
        if (
          password &&
          password.length >= 6 &&
          auth.currentUser.email === email
        )
          await updatePassword(auth.currentUser, password);

        showNotification("success", "✅ User updated");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          email,
          ...profile,
          createdAt: serverTimestamp(),
          active: true,
        });
        showNotification("success", "✅ User created");
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      showNotification("error", `❌ ${err.message || "Save failed"}`);
    }
  };

  /* ─────────────────────────── Sorting */
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const getSortedUsers = (list) => {
    if (!sortConfig.key) return list;
    return [...list].sort((a, b) => {
      const aVal = a[sortConfig.key] || "";
      const bVal = b[sortConfig.key] || "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  /* ─────────────────────────── Bulk Actions */
  const handleSelectAll = (e) =>
    setSelectedUsers(e.target.checked ? filteredUsers.map((u) => u.id) : []);

  const handleSelectUser = (id) =>
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleBulkStatusChange = async (active) => {
    try {
      await Promise.all(
        selectedUsers.map((id) => updateDoc(doc(db, "users", id), { active })),
      );
      fetchUsers();
      setSelectedUsers([]);
      showNotification("success", `✅ ${selectedUsers.length} updated`);
    } catch {
      showNotification("error", "❌ Bulk update failed");
    }
  };

  /* ─────────────────────────── Export CSV */
  const handleExport = () => {
    const csv = [
      ["Name", "Email", "Phone", "Role", "Status"],
      ...filteredUsers.map((u) => [
        `${u.firstName} ${u.lastName}`,
        u.email,
        u.phone || "",
        u.role,
        u.active ? "Active" : "Inactive",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showNotification("success", "📥 Users exported");
  };

  /* ───────────────  Profile / Logout  ─────────────── */
  const handleProfile = () => navigate("/profile");
  const handleLogout = () => signOut(auth).then(() => navigate("/"));

  /* ─────────────────────────── Filtering */
  const roleOptions = ["All", "Student", "Teacher", "Admin"];

  const filteredUsers = getSortedUsers(
    users.filter((u) => {
      const matchRole =
        filteredRole === "All" ||
        u.role?.toLowerCase() === filteredRole.toLowerCase();
      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && u.active) ||
        (statusFilter === "Inactive" && !u.active);
      const matchSearch =
        searchQuery === "" ||
        `${u.firstName} ${u.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery);
      return matchRole && matchStatus && matchSearch;
    }),
  );

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    students: users.filter((u) => u.role === "student").length,
    teachers: users.filter((u) => u.role === "teacher").length,
    admins: users.filter((u) => u.role === "admin").length,
  };

  /* ─────────────────────────── UI */
  return (
    <div className="flex h-screen bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
      {/* Sidebar */}
      <AdminSidebar
        minimized={sidebarMinimized}
        setSidebarMinimized={(val) => {
          localStorage.setItem("sidebarMinimized", val);
          setSidebarMinimized(val);
        }}
      />

      {/* Top Nav */}
      <AdminTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={(val) => {
          localStorage.setItem("sidebarMinimized", val);
          setSidebarMinimized(val);
        }}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      {/* Main */}
      <div
        className={`flex-1 overflow-y-auto transition-all duration-300 pt-20 px-8 pb-8 ${
          sidebarMinimized ? "ml-[72px]" : "ml-[240px]"
        }`}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#2A2A2A]">
            User Management
          </h1>
          <p className="text-[#666666] text-sm">
            Manage users, roles, and permissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total Users", value: stats.total, color: "#2A2A2A", icon: Users },
            { label: "Active", value: stats.active, color: "#28A745", icon: CheckCircle },
            { label: "Students", value: stats.students, color: "#3399FF" },
            { label: "Teachers", value: stats.teachers, color: "#FF9800" },
            { label: "Admins", value: stats.admins, color: "#9C27B0" },
          ].map(({ label, value, color, icon: Icon }, i) => (
            <div key={i} className="bg-white border border-[#DDDDDD] rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#666666] mb-1">{label}</p>
                  <p className="text-2xl font-bold" style={{ color }}>
                    {value}
                  </p>
                </div>
                {Icon && <Icon className="w-8 h-8" style={{ color }} />}
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-[#DDDDDD] rounded-lg p-4 mb-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#DDDDDD] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3399FF] text-sm"
              />
            </div>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-md border text-sm font-medium flex items-center gap-2 transition ${
                showFilters
                  ? "bg-[#3399FF] text-white border-[#3399FF]"
                  : "bg-white text-[#2A2A2A] border-[#DDDDDD] hover:bg-[#E8F6FF]"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={filteredUsers.length === 0}
              className="px-4 py-2 rounded-md bg-white border border-[#DDDDDD] hover:bg-[#E8F6FF] text-sm font-medium text-[#2A2A2A] flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Add */}
            <button
              onClick={() => openModal(null)}
              className="px-4 py-2 rounded-md bg-[#3399FF] hover:bg-[#2785E3] text-sm font-medium text-white flex items-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[#DDDDDD] flex flex-wrap gap-4">
              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-2">
                  Role
                </label>
                <div className="flex gap-2">
                  {roleOptions.map((role) => (
                    <button
                      key={role}
                      onClick={() => setFilteredRole(role)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition ${
                        filteredRole === role
                          ? "bg-[#3399FF] text-white border-[#3399FF]"
                          : "bg-white text-[#2A2A2A] border-[#DDDDDD] hover:bg-[#E8F6FF]"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-2">
                  Status
                </label>
                <div className="flex gap-2">
                  {["All", "Active", "Inactive"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition ${
                        statusFilter === status
                          ? "bg-[#3399FF] text-white border-[#3399FF]"
                          : "bg-white text-[#2A2A2A] border-[#DDDDDD] hover:bg-[#E8F6FF]"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#DDDDDD] flex items-center gap-4">
              <span className="text-sm font-medium text-[#2A2A2A]">
                {selectedUsers.length} selected
              </span>
              <button
                onClick={() => handleBulkStatusChange(true)}
                className="px-3 py-1.5 rounded-md bg-[#28A745] hover:bg-[#218838] text-white text-xs"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkStatusChange(false)}
                className="px-3 py-1.5 rounded-md bg-[#FFC107] hover:bg-[#E0A800] text-white text-xs"
              >
                Deactivate
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="px-3 py-1.5 rounded-md bg-[#6C757D] hover:bg-[#5A6268] text-white text-xs"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mb-3 text-sm text-[#666666]">
          Showing {filteredUsers.length} of {users.length}
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white border border-[#DDDDDD] rounded-lg shadow-sm flex justify-center py-20">
            <Spinner />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white border border-[#DDDDDD] rounded-lg shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-[#CCCCCC] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#2A2A2A] mb-2">
              No users found
            </h3>
            <p className="text-[#666666] mb-4">
              {searchQuery ||
              filteredRole !== "All" ||
              statusFilter !== "All"
                ? "Adjust your search or filters"
                : "Add your first user"}
            </p>
            {!searchQuery &&
              filteredRole === "All" &&
              statusFilter === "All" && (
                <button
                  onClick={() => openModal(null)}
                  className="px-6 py-2 rounded-md bg-[#3399FF] hover:bg-[#2785E3] text-white text-sm flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              )}
          </div>
        ) : (
          <div className="overflow-hidden border border-[#DDDDDD] rounded-lg shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#3399FF] text-white">
                  <tr>
                    <th className="px-4 py-3 border-r border-[#2785E3]">
                      <input
                        type="checkbox"
                        checked={
                          selectedUsers.length === filteredUsers.length &&
                          filteredUsers.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-white cursor-pointer"
                      />
                    </th>
                    {[
                      { key: "firstName", label: "Name" },
                      { key: "email", label: "Email" },
                      { key: "phone", label: "Phone" },
                      { key: "role", label: "Role" },
                      { key: "active", label: "Status" },
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="px-4 py-3 text-left border-r border-[#2785E3] cursor-pointer hover:bg-[#2785E3] transition select-none"
                      >
                        <div className="flex items-center gap-2">
                          {label}
                          {sortConfig.key === key && (
                            <span className="text-xs">
                              {sortConfig.direction === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDDDDD]">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-[#E8F6FF] transition ${
                        selectedUsers.includes(u.id) ? "bg-[#E8F6FF]" : ""
                      }`}
                    >
                      <td className="px-4 py-3 border-r border-[#DDDDDD]">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => handleSelectUser(u.id)}
                          className="w-4 h-4 rounded border-[#DDDDDD] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 border-r border-[#DDDDDD] font-medium text-[#2A2A2A]">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-4 py-3 border-r border-[#DDDDDD] text-[#666666]">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 border-r border-[#DDDDDD] text-[#666666]">
                        {u.phone || "—"}
                      </td>
                      <td className="px-4 py-3 border-r border-[#DDDDDD]">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            u.role === "admin"
                              ? "bg-[#F3E5F5] text-[#9C27B0]"
                              : u.role === "teacher"
                              ? "bg-[#FFF3E0] text-[#FF9800]"
                              : "bg-[#E3F2FD] text-[#3399FF]"
                          }`}
                        >
                          {u.role?.[0].toUpperCase() + u.role?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-[#DDDDDD]">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.active
                              ? "bg-[#D7F9D0] text-[#285C2A]"
                              : "bg-[#FFEFD5] text-[#996A00]"
                          }`}
                        >
                          {u.active ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStatusToggle(u.id, !u.active)}
                            className={`p-1.5 rounded-md transition ${
                              u.active
                                ? "bg-[#FFC107] hover:bg-[#E0A800] text-white"
                                : "bg-[#28A745] hover:bg-[#218838] text-white"
                            }`}
                            title={u.active ? "Deactivate" : "Activate"}
                          >
                            {u.active ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleSendResetLink(u.email)}
                            className="p-1.5 rounded-md bg-[#E3F2FD] hover:bg-[#BBDEFB] text-[#1976D2] transition"
                            title="Send Reset Link"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal(u)}
                            className="p-1.5 rounded-md bg-[#E8F6FF] hover:bg-[#D0EBFF] text-[#0073E6] transition"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit/Add Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-[#DDDDDD] rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-6 text-[#2A2A2A] flex items-center gap-2">
                {selectedUser ? (
                  <>
                    <Edit2 className="w-5 h-5 text-[#3399FF]" />
                    Edit User
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 text-[#3399FF]" />
                    Add User
                  </>
                )}
              </h3>
              {/* Form */}
              <div className="space-y-4">
                {/* Names */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "firstName", label: "First Name", placeholder: "John" },
                    { key: "lastName", label: "Last Name", placeholder: "Doe" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1.5">
                        {label} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={formData[key]}
                        onChange={(e) => {
                          setFormData({ ...formData, [key]: e.target.value });
                          setFormErrors({ ...formErrors, [key]: "" });
                        }}
                        className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 ${
                          formErrors[key]
                            ? "border-red-500 focus:ring-red-500"
                            : "border-[#DDDDDD] focus:ring-[#3399FF]"
                        }`}
                      />
                      {formErrors[key] && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {formErrors[key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setFormErrors({ ...formErrors, email: "" });
                    }}
                    disabled={selectedUser}
                    className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 ${
                      formErrors.email
                        ? "border-red-500 focus:ring-red-500"
                        : "border-[#DDDDDD] focus:ring-[#3399FF]"
                    } ${selectedUser ? "bg-gray-50 cursor-not-allowed" : ""}`}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formErrors.email}
                    </p>
                  )}
                  {selectedUser && (
                    <p className="text-xs text-[#666666] mt-1">
                      Email cannot be changed
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      setFormErrors({ ...formErrors, phone: "" });
                    }}
                    className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 ${
                      formErrors.phone
                        ? "border-red-500 focus:ring-red-500"
                        : "border-[#DDDDDD] focus:ring-[#3399FF]"
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formErrors.phone}
                    </p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 border-[#DDDDDD] focus:ring-[#3399FF]"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Password {!selectedUser && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={
                      selectedUser
                        ? "Leave blank to keep current"
                        : "Minimum 6 characters"
                    }
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setFormErrors({ ...formErrors, password: "" });
                    }}
                    className={`w-full px-4 py-2.5 border rounded-md focus:outline-none focus:ring-2 ${
                      formErrors.password
                        ? "border-red-500 focus:ring-red-500"
                        : "border-[#DDDDDD] focus:ring-[#3399FF]"
                    }`}
                  />
                  {formErrors.password && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formErrors.password}
                    </p>
                  )}
                  {selectedUser && !formErrors.password && (
                    <p className="text-xs text-[#666666] mt-1">
                      Leave blank to keep current password
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#DDDDDD]">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormErrors({});
                  }}
                  className="px-5 py-2.5 rounded-md bg-white border border-[#DDDDDD] hover:bg-[#F5F5F5] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 rounded-md bg-[#3399FF] hover:bg-[#2785E3] text-white text-sm shadow-sm"
                >
                  {selectedUser ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
