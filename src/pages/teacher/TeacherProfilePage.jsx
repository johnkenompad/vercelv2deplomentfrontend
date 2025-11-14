/* --------------------------------------------------------------------------  
   TeacherProfilePage.jsx – vivid-blue redesign with table layout (UPDATED)
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Sidebar from "../../components/Sidebar";            // 🔄 renamed import
import NotificationBell from "../../components/NotificationBell";
import { toast } from "react-toastify";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TeacherProfilePage() {
  /* ───────────────────────────── State */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [userData, setUserData] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const auth = getAuth();
  const navigate = useNavigate();

  /* ───────────────────────────── Effects */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setUserData(snap.data());

      /* 🔄 Sync Firestore email once user verifies the new address */
      if (user.emailVerified && snap.exists() && snap.data().email !== user.email) {
        try {
          await updateDoc(doc(db, "users", user.uid), { email: user.email });
          toast.success("Email verification complete. Profile synced.");
          const refreshed = await getDoc(doc(db, "users", user.uid));
          if (refreshed.exists()) setUserData(refreshed.data());
        } catch (err) {
          toast.error(err.message);
        }
      }
    });

    return () => unsub();
  }, [auth, navigate]);

  /* ───────────────────────────── Handlers */
  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      toast.error("Please enter a new email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!currentPassword.trim()) {
      toast.error("Please enter your current password for security verification");
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;

      if (user.email === newEmail) {
        toast.info("This is already your current email address");
        setIsLoading(false);
        return;
      }

      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);

      await updateEmail(user, newEmail);
      await sendEmailVerification(user);

      toast.success(
        "Verification link sent to your new email! Please verify it to complete the change.",
        { autoClose: 6000 },
      );

      setNewEmail("");
      setCurrentPassword("");
      setShowEmailInput(false);
    } catch (e) {
      console.error("Email change error:", e);

      if (e.code === "auth/wrong-password") {
        toast.error("Incorrect password. Please try again.");
      } else if (e.code === "auth/email-already-in-use") {
        toast.error("This email is already registered to another account.");
      } else if (e.code === "auth/invalid-email") {
        toast.error("Invalid email format. Please check and try again.");
      } else if (e.code === "auth/requires-recent-login") {
        toast.error("For security, please log out and log back in before changing your email.");
      } else {
        toast.error(e.message || "Failed to update email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!currentPassword.trim()) {
      toast.error("Please enter your current password for security verification");
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);

      toast.success("Password updated successfully!");
      setNewPassword("");
      setCurrentPassword("");
      setShowPasswordInput(false);
    } catch (e) {
      console.error("Password change error:", e);

      if (e.code === "auth/wrong-password") {
        toast.error("Incorrect current password. Please try again.");
      } else if (e.code === "auth/weak-password") {
        toast.error("Password is too weak. Use a stronger password.");
      } else if (e.code === "auth/requires-recent-login") {
        toast.error("For security, please log out and log back in before changing your password.");
      } else {
        toast.error(e.message || "Failed to update password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => signOut(auth).then(() => navigate("/"));

  /* ───────────────────────────── UI – Loading */
  if (!userData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF]">
        <div className="text-[#3399FF] text-lg">Loading profile...</div>
      </div>
    );
  }

  /* ───────────────────────────── UI – Page */
  return (
    <>
      {/* ─── Top Bar ─────────────────────────────────────────── */}
      <header
        className="fixed inset-x-0 top-0 z-50 h-14 bg-[#3399FF] text-white flex items-center justify-between shadow-sm"
        style={{
          paddingLeft: sidebarMinimized ? "88px" : "256px",
          paddingRight: "24px",
          transition: "padding-left 300ms ease",
        }}
      >
        <span className="font-semibold flex items-center gap-1 select-none">
          <span className="text-lg">⚡</span>
          <span className="hidden sm:inline">QuizRush</span>
          <span className="hidden lg:inline">&nbsp;Teacher&nbsp;Profile</span>
        </span>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white text-[#3399FF] border border-[#3399FF] hover:bg-[#E8F6FF] text-sm font-medium px-4 py-1.5 rounded-md transition"
          >
            <LogOut size={16} strokeWidth={2} /> Logout
          </button>
        </div>
      </header>

      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#000000]">
        {/* 🔄 Sidebar component */}
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
          {/* Page Header */}
          <header className="px-8 py-5">
            <h1 className="text-2xl font-bold text-[#3A3A3A]">My Profile</h1>
          </header>

          {/* Profile Details Card */}
          <section className="px-8 pb-6 max-w-7xl">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-[#B8D4F1]">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] text-white px-5 py-3 font-bold text-lg">
                Profile Details
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {/* Row 1: Image + First Name + Department */}
                    <tr>
                      <td
                        rowSpan={8}
                        className="border border-[#D1D5DB] bg-[#F9FAFB] p-4 w-48 align-top"
                      >
                        <div className="w-40 h-40 bg-white border-2 border-[#E5E7EB] rounded-md flex items-center justify-center overflow-hidden shadow-sm">
                          <img
                            src="https://via.placeholder.com/150"
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {userData.employeeId && (
                          <div className="mt-3 text-center">
                            <div className="text-xs font-semibold text-[#6B7280] mb-1">
                              Employee ID
                            </div>
                            <div className="text-sm font-bold text-[#3399FF]">
                              {userData.employeeId}
                            </div>
                          </div>
                        )}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151] w-40">
                        First Name:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.firstName || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151] w-40">
                        Department:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.department || "N/A"}
                      </td>
                    </tr>

                    {/* Row 2: Middle Name + Position */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Middle Name:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.middleName || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Position:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.position || "N/A"}
                      </td>
                    </tr>

                    {/* Row 3: Last Name + Academic Level */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Last Name:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.lastName || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Academic Level:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.academicLevel || "N/A"}
                      </td>
                    </tr>

                    {/* Row 4: Name Suffix + Subjects Taught */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Name Suffix:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.suffix || "—"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Subjects Taught:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.subjects || "N/A"}
                      </td>
                    </tr>

                    {/* Row 5: Birthdate + Teaching Experience */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Birthdate:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.birthdate || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Teaching Experience:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.teachingExperience || "N/A"}
                      </td>
                    </tr>

                    {/* Row 6: Gender + Office Room */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Gender:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.gender || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Office Room:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.officeRoom || "N/A"}
                      </td>
                    </tr>

                    {/* Row 7: Landline + Verified Email */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Landline #:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.landline || "—"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Verified Email:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.email || auth.currentUser?.email || "N/A"}
                      </td>
                    </tr>

                    {/* Row 8: Mobile + Facebook */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Mobile #:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.mobile || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left font-bold text-sm text-[#374151]">
                        Facebook:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.facebook || "N/A"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <section className="px-8 pb-12 max-w-7xl">
            <div className="bg-white rounded-lg shadow-lg border border-[#B8D4F1] p-6">
              <h2 className="text-lg font-bold text-[#3A3A3A] mb-4">
                Account Settings
              </h2>

              <div className="space-y-4">
                {/* Change Password Section */}
                <div className="border-b border-[#E5E7EB] pb-4">
                  {!showPasswordInput ? (
                    <button
                      onClick={() => setShowPasswordInput(true)}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] hover:from-[#2A8AEE] hover:to-[#4BA0EE] text-white py-2.5 px-6 rounded-md text-sm font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Change Password
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-[#374151] mb-1">
                          Current Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          disabled={isLoading}
                          className="w-full max-w-md px-3 py-2 border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3399FF] text-sm disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#374151] mb-1">
                          New Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 6 characters)"
                          disabled={isLoading}
                          className="w-full max-w-md px-3 py-2 border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3399FF] text-sm disabled:bg-gray-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handlePasswordChange}
                          disabled={isLoading}
                          className="bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] hover:from-[#2A8AEE] hover:to-[#4BA0EE] text-white py-2 px-5 rounded-md text-sm font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? "Updating..." : "Update Password"}
                        </button>
                        <button
                          onClick={() => {
                            setShowPasswordInput(false);
                            setNewPassword("");
                            setCurrentPassword("");
                          }}
                          disabled={isLoading}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-5 rounded-md text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Change Email Section */}
                <div>
                  {!showEmailInput ? (
                    <button
                      onClick={() => setShowEmailInput(true)}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] hover:from-[#2A8AEE] hover:to-[#4BA0EE] text-white py-2.5 px-6 rounded-md text-sm font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Change Email
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                        <strong>Note:</strong> You'll receive a verification link at your new email address. Your email will update after verification.
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#374151] mb-1">
                          Current Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          disabled={isLoading}
                          className="w-full max-w-md px-3 py-2 border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3399FF] text-sm disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#374151] mb-1">
                          New Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="Enter new email address"
                          disabled={isLoading}
                          className="w-full max-w-md px-3 py-2 border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3399FF] text-sm disabled:bg-gray-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEmailChange}
                          disabled={isLoading}
                          className="bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] hover:from-[#2A8AEE] hover:to-[#4BA0EE] text-white py-2 px-5 rounded-md text-sm font-semibold shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? "Updating..." : "Update Email"}
                        </button>
                        <button
                          onClick={() => {
                            setShowEmailInput(false);
                            setNewEmail("");
                            setCurrentPassword("");
                          }}
                          disabled={isLoading}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-5 rounded-md text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
