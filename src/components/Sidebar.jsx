/* --------------------------------------------------------------------------  
   Sidebar.jsx – Teacher menu (production-ready)
   • Primary accent  : #3399FF
   • Dark text/icons : #333333
   • Borders         : #E5E7EB
   • Hover / active  : light-blue tints (#E8F6FF)
---------------------------------------------------------------------------*/
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getAuth,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

import {
  Home,
  Edit3,
  List,
  BookOpenCheck,
  BarChart3,
  Search,
  FilePlus,
  Folder,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';

export default function Sidebar({ minimized, setSidebarMinimized }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  /* Dynamic teacher name */
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDisplayName('');
        setIsLoading(false);
        return;
      }

      let name = user.displayName || '';
      if (!name) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            name =
              data.fullName ||
              data.name ||
              data.displayName ||
              `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
          }
        } catch (err) {
          console.error('Sidebar name fetch error:', err);
        }
      }
      setDisplayName(name || 'Teacher');
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const toggleSidebar = () => {
    if (typeof setSidebarMinimized === 'function') {
      setSidebarMinimized((prev) => !prev);
    }
  };

  /* Navigation definition */
  const navSections = [
    {
      title: 'Main Menu',
      buttons: [
        { label: 'Dashboard', icon: Home, path: '/teacher-dashboard' },
        { label: 'Create Quiz', icon: FilePlus, path: '/generate-quiz' },
        { label: 'My Quizzes', icon: Folder, path: '/teacher/my-quizzes' },
        { label: 'Customize Quiz', icon: Edit3, path: '/customize-quiz' },
        { label: 'Assign Quizzes', icon: List, path: '/assign-quizzes' },
        { label: 'Manage Class', icon: Users, path: '/teacher/manage-class' },
      ],
    },
    {
      title: 'Tracking & Reports',
      buttons: [
        { label: 'Student Progress', icon: BookOpenCheck, path: '/progress' },
        { label: 'Reports', icon: BarChart3, path: '/reports' },
      ],
    },
    {
      title: 'Game Hub',
      buttons: [
        { label: 'Word Search', icon: Search, path: '/teacher/games/word-search' },
      ],
    },
  ];

  /* Render */
  return (
    <aside
      className={`
        fixed top-0 left-0 z-50 flex h-screen flex-col
        border-r border-[#E5E7EB] bg-[#F3F8FC] shadow-lg transition-all duration-300 ease-in-out
        ${minimized ? 'w-[70px]' : 'w-[260px]'}
      `}
    >
      {/* Main content wrapper with scroll */}
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="p-4">
          {/* Toggle button */}
          <button
            onClick={toggleSidebar}
            aria-label={minimized ? 'Expand sidebar' : 'Collapse sidebar'}
            className="
              mb-5 flex h-10 w-10 items-center justify-center rounded-lg
              bg-white text-[#3399FF] shadow-sm transition-all duration-200
              hover:bg-[#3399FF] hover:text-white hover:shadow-md
              focus:outline-none focus:ring-2 focus:ring-[#3399FF] focus:ring-offset-2
            "
          >
            {minimized ? (
              <ChevronRight size={20} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={20} strokeWidth={2.5} />
            )}
          </button>

          {/* Profile section */}
          <div
            onClick={() => navigate('/teacher/profile')}
            className={`
              mb-6 cursor-pointer rounded-xl bg-white p-3 shadow-sm
              transition-all duration-200 hover:shadow-md hover:scale-[1.02]
              ${minimized ? 'flex justify-center' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3399FF] to-[#2785E3] text-xl shadow-sm">
                👩‍🏫
              </div>
              {!minimized && (
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">
                    Teacher
                  </p>
                  <p className="truncate text-sm font-semibold text-[#333333]">
                    {isLoading ? 'Loading...' : displayName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation sections */}
          <nav className="space-y-6">
            {navSections.map((section, idx) => (
              <div key={idx}>
                {!minimized && (
                  <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.buttons.map((btn) => {
                    const Icon = btn.icon;
                    const active = isActive(btn.path);
                    
                    return (
                      <button
                        key={btn.path}
                        onClick={() => navigate(btn.path)}
                        title={minimized ? btn.label : undefined}
                        className={`
                          group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5
                          text-sm font-medium transition-all duration-200
                          ${minimized ? 'justify-center' : ''}
                          ${
                            active
                              ? 'bg-[#E8F6FF] text-[#3399FF] shadow-sm'
                              : 'text-[#333333] hover:bg-white hover:shadow-sm'
                          }
                        `}
                      >
                        {/* Active indicator */}
                        {active && !minimized && (
                          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#3399FF]" />
                        )}
                        
                        {/* Icon */}
                        <Icon
                          size={20}
                          className={`
                            flex-shrink-0 transition-transform duration-200
                            ${active ? 'scale-110' : 'group-hover:scale-105'}
                          `}
                          strokeWidth={active ? 2.5 : 2}
                        />
                        
                        {/* Label */}
                        {!minimized && (
                          <span className="truncate">{btn.label}</span>
                        )}

                        {/* Tooltip for minimized state */}
                        {minimized && (
                          <div className="
                            pointer-events-none absolute left-full ml-2 rounded-md
                            bg-[#333333] px-3 py-1.5 text-xs font-medium text-white
                            opacity-0 shadow-lg transition-opacity duration-200
                            group-hover:opacity-100 whitespace-nowrap z-50
                          ">
                            {btn.label}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer branding */}
      {!minimized && (
        <div className="border-t border-[#E5E7EB] bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F3F8FC] text-[#3399FF]">
              ✨
            </div>
            <span className="font-medium">QuizRush</span>
          </div>
        </div>
      )}
    </aside>
  );
}