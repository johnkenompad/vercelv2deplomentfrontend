// src/pages/admin/AdminSettings.jsx
import React, { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import AdminTopNavBar from "../../components/AdminTopNavBar";
import { useNotification } from "../../components/Notification";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";

/**
 * AdminSettings.jsx – vivid-blue QuizRush redesign
 * --------------------------------------------------------------------------
 *  • Uses shared AdminTopNavBar component for consistent app bar
 *  • Dynamic padding-left (88 px ⇆ 256 px) synced to sidebar width
 *  • My Profile / Logout handled via AdminTopNavBar props
 * --------------------------------------------------------------------------
 */

export default function AdminSettings() {
  const [sidebarMinimized, setSidebarMinimized] = useState(
    () => localStorage.getItem("sidebarMinimized") === "true",
  );
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const auth = getAuth();

  /* ─────────────── Settings state ─────────────── */
  const [siteTitle, setSiteTitle] = useState("QuizRush");
  const [theme, setTheme] = useState("light");
  const [quizLimit, setQuizLimit] = useState(10);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState("medium");
  const [adminEmail, setAdminEmail] = useState("admin@quizrush.com");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = () =>
    showNotification("success", "💾 Settings saved successfully.");

  /* ─────────────── Helpers ─────────────── */
  const Input = (props) => (
    <input
      {...props}
      className="w-full px-4 py-2 rounded-md bg-[#F3F8FC] border border-[#DDDDDD] focus:outline-none focus:ring-2 focus:ring-[#3399FF]"
    />
  );
  const Select = (props) => (
    <select
      {...props}
      className="w-full px-4 py-2 rounded-md bg-[#F3F8FC] border border-[#DDDDDD] focus:outline-none focus:ring-2 focus:ring-[#3399FF]"
    />
  );

  const handleProfile = () => navigate("/profile");
  const handleLogout = () => signOut(auth).then(() => navigate("/"));

  /* ─────────────── UI ─────────────── */
  return (
    <div className="flex h-screen bg-gradient-to-b from-[#E8F6FF] to-[#D9F0FF] text-[#333333]">
      {/* 📚 Sidebar */}
      <AdminSidebar
        minimized={sidebarMinimized}
        setSidebarMinimized={(val) => {
          localStorage.setItem("sidebarMinimized", val);
          setSidebarMinimized(val);
        }}
      />

      {/* 🟦 Top Navbar */}
      <AdminTopNavBar
        sidebarMinimized={sidebarMinimized}
        setSidebarMinimized={(val) => {
          localStorage.setItem("sidebarMinimized", val);
          setSidebarMinimized(val);
        }}
        onProfileClick={handleProfile}
        onLogoutClick={handleLogout}
      />

      {/* 📄 Main */}
      <div
        className={`flex-1 overflow-y-auto transition-all duration-300 pt-14 px-8 gap-4 ${
          sidebarMinimized ? "ml-[72px]" : "ml-[240px]"
        }`}
      >
        {/* Spacer below App Bar */}
        <div className="mt-6" />

        {/* ⚙️ Settings Form */}
        <section className="max-w-5xl mx-auto bg-white border border-[#DDDDDD] rounded-md shadow-sm p-8 space-y-10">
          {/* System */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-[#3A3A3A]">
              🔧 System Configuration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Site Title
                </label>
                <Input
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Theme</label>
                <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="light">🌞 Light</option>
                  <option value="dark">🌙 Dark</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Questions per Quiz
                </label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={quizLimit}
                  onChange={(e) => setQuizLimit(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Security */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-[#3A3A3A]">
              🔐 Security Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  User Registration
                </label>
                <Select
                  value={registrationEnabled ? "enabled" : "disabled"}
                  onChange={(e) =>
                    setRegistrationEnabled(e.target.value === "enabled")
                  }
                >
                  <option value="enabled">✅ Enabled</option>
                  <option value="disabled">❌ Disabled</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Password Strength
                </label>
                <Select
                  value={passwordStrength}
                  onChange={(e) => setPasswordStrength(e.target.value)}
                >
                  <option value="low">Weak</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Admin Account */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-[#3A3A3A]">
              👤 Admin Account
            </h2>
            <div className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Admin Email
                </label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
              <button
                onClick={() => alert("🔒 Password change feature coming soon")}
                className="text-[#0073E6] hover:text-[#2785E3] hover:underline text-sm font-medium"
              >
                🔒 Change Password
              </button>
            </div>
          </div>

          {/* Maintenance */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-[#3A3A3A]">
              🛠️ System Maintenance
            </h2>
            <div className="space-y-4 max-w-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Enable Maintenance Mode
                </span>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="scale-125 accent-[#3399FF]"
                />
              </div>
              <button
                onClick={() => alert("⚠️ Placeholder: Reset all quiz data")}
                className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
              >
                🔥 Reset All Quiz Data
              </button>
            </div>
          </div>

          {/* Save */}
          <div className="text-right">
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-md bg-[#3399FF] hover:bg-[#2785E3] text-white text-sm font-medium transition"
            >
              💾 Save Settings
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
