import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useNotification } from '../../components/Notification';

export default function AdminSettings() {
  const [sidebarMinimized, setSidebarMinimized] = useState(() => localStorage.getItem('sidebarMinimized') === 'true');
  const { showNotification } = useNotification();

  const [siteTitle, setSiteTitle] = useState('QuizRush');
  const [theme, setTheme] = useState('light');
  const [quizLimit, setQuizLimit] = useState(10);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState('medium');
  const [adminEmail, setAdminEmail] = useState('admin@quizrush.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = () => {
    // Later replace with Firestore save if needed
    showNotification('success', '💾 Settings saved successfully.');
  };

  return (
    <div className="flex min-h-screen bg-[#F6EFFC] text-[#5C517B]">
      <AdminSidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />
      <main className={`flex-1 p-10 sm:p-12 transition-all duration-300 ${sidebarMinimized ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <div className="max-w-6xl mx-auto bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl border border-[#EBD3FA] p-8 space-y-10">
          <h1 className="text-3xl font-extrabold text-[#B76EF1] tracking-tight">⚙️ Admin Settings</h1>

          {/* System Configuration */}
          <section>
            <h2 className="text-xl font-semibold mb-4">🔧 System Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Site Title</label>
                <input
                  type="text"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg shadow-sm bg-[#F6EFFC] border border-[#EBD3FA] text-[#5C517B] focus:ring-2 focus:ring-[#B76EF1]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#F6EFFC] border border-[#EBD3FA] focus:ring-2 focus:ring-[#B76EF1]"
                >
                  <option value="light">🌞 Light</option>
                  <option value="dark">🌙 Dark</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Max Questions per Quiz</label>
                <input
                  type="number"
                  value={quizLimit}
                  onChange={(e) => setQuizLimit(e.target.value)}
                  min={1}
                  max={50}
                  className="w-full px-4 py-3 rounded-lg bg-[#F6EFFC] border border-[#EBD3FA] focus:ring-2 focus:ring-[#B76EF1]"
                />
              </div>
            </div>
          </section>

          {/* Security Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">🔐 Security Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">User Registration</label>
                <select
                  value={registrationEnabled ? 'enabled' : 'disabled'}
                  onChange={(e) => setRegistrationEnabled(e.target.value === 'enabled')}
                  className="w-full px-4 py-3 rounded-lg bg-[#F6EFFC] border border-[#EBD3FA] focus:ring-2 focus:ring-[#B76EF1]"
                >
                  <option value="enabled">✅ Enabled</option>
                  <option value="disabled">❌ Disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Password Strength</label>
                <select
                  value={passwordStrength}
                  onChange={(e) => setPasswordStrength(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#F6EFFC] border border-[#EBD3FA] focus:ring-2 focus:ring-[#B76EF1]"
                >
                  <option value="low">Weak</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
            </div>
          </section>

          {/* Admin Account */}
          <section>
            <h2 className="text-xl font-semibold mb-4">👤 Admin Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#F6EFFC] border border-[#EBD3FA] focus:ring-2 focus:ring-[#B76EF1]"
                />
              </div>
              <button
                onClick={() => alert('🔒 Password change feature coming soon')}
                className="text-[#974EC3] hover:text-[#B76EF1] hover:underline font-semibold"
              >
                🔒 Change Password
              </button>
            </div>
          </section>

          {/* Maintenance */}
          <section>
            <h2 className="text-xl font-semibold mb-4">🛠️ System Maintenance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Enable Maintenance Mode</span>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="scale-125 accent-[#B76EF1]"
                />
              </div>
              <button
                onClick={() => alert('⚠️ Placeholder: Reset all quiz data')}
                className="mt-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
              >
                🔥 Reset All Quiz Data
              </button>
            </div>
          </section>

          <div className="text-right">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-[#B76EF1] hover:bg-[#974EC3] text-white rounded-lg shadow font-semibold transition"
            >
              💾 Save Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
