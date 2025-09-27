import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import {
  Building, Users, BookOpen, FileText,
  ShieldCheck, UserCheck, Layers, FileCheck2
} from 'lucide-react';

const AdminDashboard = () => {
  const [sidebarMinimized, setSidebarMinimized] = useState(() => localStorage.getItem('sidebarMinimized') === 'true');

  const stats = [
    { label: 'Department', count: 2, bg: 'bg-[#FFE7C7]', text: 'text-[#924C00]', icon: <Building size={28} /> },
    { label: 'Class', count: 2, bg: 'bg-[#D7F9D0]', text: 'text-[#285C2A]', icon: <Layers size={28} /> },
    { label: 'Lecturer', count: 1, bg: 'bg-[#D3EAFE]', text: 'text-[#1D4F91]', icon: <UserCheck size={28} /> },
    { label: 'Student', count: 3, bg: 'bg-[#FECACA]', text: 'text-[#991B1B]', icon: <Users size={28} /> },
    { label: 'Course', count: 2, bg: 'bg-[#FCE7F3]', text: 'text-[#831843]', icon: <BookOpen size={28} /> },
    { label: 'Questions', count: 1, bg: 'bg-[#CFFAFE]', text: 'text-[#0E7490]', icon: <FileText size={28} /> },
    { label: 'Results Generated', count: 2, bg: 'bg-[#EDE9FE]', text: 'text-[#5B21B6]', icon: <FileCheck2 size={28} /> },
    { label: 'System Users', count: 3, bg: 'bg-[#DCFCE7]', text: 'text-[#166534]', icon: <ShieldCheck size={28} /> },
  ];

  return (
    <div className="flex h-screen bg-[#F6EFFC] text-[#5C517B]">
      <AdminSidebar minimized={sidebarMinimized} setSidebarMinimized={setSidebarMinimized} />

      <div className={`flex-1 transition-all duration-300 overflow-y-auto p-8 ${sidebarMinimized ? 'ml-20' : 'ml-64'}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#B76EF1]">👑 Admin Dashboard</h1>
          <div className="flex gap-4 text-xl text-[#974EC3]">
            <span title="Messages">💬</span>
            <span title="Notifications">🔔</span>
            <span title="Profile">👤</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.map((item, idx) => (
            <div
              key={idx}
              className={`${item.bg} ${item.text} rounded-xl p-5 shadow hover:shadow-md hover:scale-[1.02] transition cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{item.count}</div>
                <div className="opacity-80">{item.icon}</div>
              </div>
              <div className="text-lg font-semibold">{item.label}</div>
              <div className="mt-3 text-center text-sm opacity-70 hover:underline">More info →</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-xs text-center text-[#A78BB0]">
          © 2025 - QuizRush Admin Panel. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default AdminDashboard;
