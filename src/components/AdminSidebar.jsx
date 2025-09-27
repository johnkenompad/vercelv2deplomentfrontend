import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  FolderCog,
  Link2,
  FileText,
  BarChart3,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';

export default function AdminSidebar({ minimized, setSidebarMinimized }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navSections = [
    {
      title: 'Main Menu',
      buttons: [
        {
          label: 'Dashboard',
          icon: <Home size={20} />,
          path: '/admin-dashboard',
        },
        {
          label: 'Data Management',
          icon: <FolderCog size={20} />,
          path: '/admin-dashboard/data-management',
        },
        {
          label: 'Entity Links',
          icon: <Link2 size={20} />,
          path: '/admin-dashboard/entity-links',
        },
        {
          label: 'Question Bank',
          icon: <FileText size={20} />,
          path: '/admin-dashboard/question-bank',
        },
      ],
    },
    {
      title: 'Reports',
      buttons: [
        {
          label: 'Exam Results',
          icon: <BarChart3 size={20} />,
          path: '/admin-dashboard/exam-results',
        },
      ],
    },
    {
      title: 'Administrator',
      buttons: [
        {
          label: 'User Management',
          icon: <Users size={20} />,
          path: '/admin-dashboard/user-management',
        },
        {
          label: 'Settings',
          icon: <Settings size={20} />,
          path: '/admin-dashboard/settings',
        },
      ],
    },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleToggleSidebar = () => {
    if (typeof setSidebarMinimized === 'function') {
      setSidebarMinimized((prev) => !prev);
    }
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 transition-all duration-300 ${
        minimized ? 'w-[72px]' : 'w-[240px]'
      } bg-white border-r border-gray-200 shadow-md flex flex-col justify-between`}
    >
      {/* Top Section */}
      <div className="p-3">
        {/* Collapse/Expand Button */}
        <button
          onClick={handleToggleSidebar}
          className="w-9 h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center mb-4 transition-transform"
          title={minimized ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {minimized ? <span className="font-bold">›</span> : <span className="font-bold">‹</span>}
        </button>

        {/* Admin Info */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-xl shadow-md">
            👑
          </div>
          {!minimized && (
            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">Administrator</p>
              <p className="text-sm font-semibold text-gray-700">admin@mail.com</p>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        {navSections.map((section, i) => (
          <div key={i} className="mb-3">
            {!minimized && (
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                {section.title}
              </p>
            )}
            {section.buttons.map((btn, j) => (
              <button
                key={j}
                onClick={() => navigate(btn.path)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-all
                  ${
                    isActive(btn.path)
                      ? 'bg-purple-100 text-purple-700 font-semibold border-l-4 border-purple-500'
                      : 'hover:bg-gray-100 text-gray-700'
                  }
                  ${minimized ? 'justify-center' : ''}`}
                title={minimized ? btn.label : undefined}
              >
                {btn.icon}
                {!minimized && <span>{btn.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="p-3">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-md bg-red-500 hover:bg-red-600 text-sm font-medium text-white
            ${minimized ? 'justify-center' : 'justify-start'}`}
        >
          <LogOut size={20} />
          {!minimized && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}
