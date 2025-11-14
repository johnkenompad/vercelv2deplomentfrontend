/* --------------------------------------------------------------------------  
   StudentProfilePage.jsx – vivid-blue redesign with table layout (UPDATED)
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

/* Shared layout components */
import StudentSidebar from "../../components/StudentSidebar";
import StudentTopNavBar from "../../components/StudentTopNavBar";

import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function StudentProfilePage() {
  /* ───────────────────────────── State */
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const [userData, setUserData] = useState(null);
  const [uid, setUid] = useState("");
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

      setUid(user.uid);

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
  const handleProfile = () => {
    // Already on profile page; could refresh or navigate as needed
    navigate("/student/profile");
  };

  const handleLogout = () => signOut(auth).then(() => navigate("/"));

  const handleEmailChange = async () => {
    if (!newEmail || !newEmail.trim()) {
      toast.error("Please enter a new email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!currentPassword || !currentPassword.trim()) {
      toast.error("Please enter your current password for security verification");
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;

      // Check if email is already in use (same as current)
      if (user.email === newEmail) {
        toast.info("This is already your current email address");
        setIsLoading(false);
        return;
      }

      /* 🔐 Re-authenticate with current credentials */
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);

      /* 🔁 Update email in Firebase Auth */
      await updateEmail(user, newEmail);

      /* 📩 Send verification email to NEW address */
      await sendEmailVerification(user);

      toast.success(
        "Verification link sent to your new email! Please verify it to complete the change.",
        { autoClose: 6000 }
      );

      // Clear inputs
      setNewEmail("");
      setCurrentPassword("");
      setShowEmailInput(false);
    } catch (e) {
      console.error("Email change error:", e);
      
      // Improved error messages
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
    if (!newPassword || !newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!currentPassword || !currentPassword.trim()) {
      toast.error("Please enter your current password for security verification");
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;

      /* 🔐 Re-authenticate first */
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);

      /* 🔑 Update password */
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

  /* ───────────────────────────── UI – Loading */
  if (!userData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF]">
        <div className="text-lg text-[#3399FF]">Loading profile...</div>
      </div>
    );
  }

  /* ───────────────────────────── UI – Page */
  return (
    <>
      {/* Global student top-navbar */}
      <StudentTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      <div className="flex h-screen pt-14 bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#000000]">
        <StudentSidebar
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
          <section className="max-w-7xl px-8 pb-6">
            <div className="overflow-hidden rounded-lg border border-[#B8D4F1] bg-white shadow-lg">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] px-5 py-3 text-lg font-bold text-white">
                Profile Details
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {/* Row 1: Image (rowspan) + First Name + Year Level */}
                    <tr>
                      <td
                        rowSpan={7}
                        className="w-48 align-top border border-[#D1D5DB] bg-[#F9FAFB] p-4"
                      >
                        <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-md border-2 border-[#E5E7EB] bg-white shadow-sm">
                          <img
                            src="https://via.placeholder.com/150"
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        {userData.studentId && (
                          <div className="mt-3 text-center">
                            <div className="mb-1 text-xs font-semibold text-[#6B7280]">
                              Student ID
                            </div>
                            <div className="text-sm font-bold text-[#3399FF]">
                              {userData.studentId}
                            </div>
                          </div>
                        )}
                      </td>
                      <th className="w-40 border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        First Name:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.firstName || "N/A"}
                      </td>
                      <th className="w-40 border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Year Level:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.yearLevel || "N/A"}
                      </td>
                    </tr>

                    {/* Row 2: Middle Name + Classification */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Middle Name:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.middleName || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Classification:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.classification || "N/A"}
                      </td>
                    </tr>

                    {/* Row 3: Last Name + College */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Last Name:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.lastName || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        College:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.college || "N/A"}
                      </td>
                    </tr>

                    {/* Row 4: Name Suffix + Course */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Name Suffix:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.suffix || "—"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Course:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.course || "N/A"}
                      </td>
                    </tr>

                    {/* Row 5: Birthdate + Gender */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Birthdate:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.birthdate || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Gender:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.gender || "N/A"}
                      </td>
                    </tr>

                    {/* Row 6: Landline + Verified Email */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Landline #:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.landline || "—"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Verified Email:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.email || auth.currentUser?.email || "N/A"}
                      </td>
                    </tr>

                    {/* Row 7: Mobile + Facebook */}
                    <tr>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
                        Mobile #:
                      </th>
                      <td className="border border-[#D1D5DB] px-4 py-2.5 text-sm text-[#1F2937]">
                        {userData.mobile || "N/A"}
                      </td>
                      <th className="border border-[#D1D5DB] bg-[#F0F4F8] px-4 py-2.5 text-left text-sm font-bold text-[#374151]">
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
          <section className="max-w-7xl px-8 pb-12">
            <div className="rounded-lg border border-[#B8D4F1] bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-bold text-[#3A3A3A]">
                Account Settings
              </h2>

              <div className="space-y-4">
                {/* Change Password Section */}
                <div className="border-b border-[#E5E7EB] pb-4">
                  {!showPasswordInput ? (
                    <button
                      onClick={() => setShowPasswordInput(true)}
                      disabled={isLoading}
                      className="rounded-md bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] py-2.5 px-6 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#2A8AEE] hover:to-[#4BA0EE] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Change Password
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#374151]">
                          Current Password{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          disabled={isLoading}
                          className="w-full max-w-md rounded-md border border-[#D1D5DB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3399FF] disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#374151]">
                          New Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 6 characters)"
                          disabled={isLoading}
                          className="w-full max-w-md rounded-md border border-[#D1D5DB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3399FF] disabled:bg-gray-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handlePasswordChange}
                          disabled={isLoading}
                          className="rounded-md bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] py-2 px-5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#2A8AEE] hover:to-[#4BA0EE] disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="rounded-md bg-gray-200 py-2 px-5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="rounded-md bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] py-2.5 px-6 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#2A8AEE] hover:to-[#4BA0EE] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Change Email
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                        <strong>Note:</strong> You'll receive a verification
                        link at your new email address. Your email will update
                        after verification.
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#374151]">
                          Current Password{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          disabled={isLoading}
                          className="w-full max-w-md rounded-md border border-[#D1D5DB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3399FF] disabled:bg-gray-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-[#374151]">
                          New Email Address{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="Enter new email address"
                          disabled={isLoading}
                          className="w-full max-w-md rounded-md border border-[#D1D5DB] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3399FF] disabled:bg-gray-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEmailChange}
                          disabled={isLoading}
                          className="rounded-md bg-gradient-to-r from-[#3399FF] to-[#5CAFFF] py-2 px-5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#2A8AEE] hover:to-[#4BA0EE] disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="rounded-md bg-gray-200 py-2 px-5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
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
