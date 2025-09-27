import React, { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import {
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  FileText,
  UserRound,
  FileCheck,
} from "lucide-react";

const managementItems = [
  {
    title: "Departments",
    icon: <Building2 className="w-6 h-6 text-[#974EC3]" />,
    description: "Manage academic departments",
  },
  {
    title: "Courses",
    icon: <BookOpen className="w-6 h-6 text-[#974EC3]" />,
    description: "Create or update courses",
  },
  {
    title: "Classes",
    icon: <Users className="w-6 h-6 text-[#974EC3]" />,
    description: "Organize student classes",
  },
  {
    title: "Lecturers",
    icon: <UserRound className="w-6 h-6 text-[#974EC3]" />,
    description: "Manage lecturer profiles",
  },
  {
    title: "Students",
    icon: <GraduationCap className="w-6 h-6 text-[#974EC3]" />,
    description: "Add or edit student records",
  },
  {
    title: "Questions",
    icon: <FileText className="w-6 h-6 text-[#974EC3]" />,
    description: "View and manage quiz questions",
  },
  {
    title: "Results",
    icon: <FileCheck className="w-6 h-6 text-[#974EC3]" />,
    description: "Monitor quiz results and scores",
  },
];

const DataManagement = () => {
  const [sidebarMinimized, setSidebarMinimized] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F6EFFC] text-[#5C517B]">
      <AdminSidebar
        minimized={sidebarMinimized}
        setSidebarMinimized={setSidebarMinimized}
      />

      <div
        className={`transition-all duration-300 ease-in-out flex-1 p-8 ${
          sidebarMinimized ? "pl-[72px]" : "pl-[240px]"
        }`}
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-[#B76EF1] mb-8">
          ⚡ <span className="text-[#5C517B]">Data Management</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managementItems.map((item, index) => (
            <div
              key={index}
              className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-2xl transition border border-[#EBD3FA]"
            >
              <div className="flex items-start gap-5">
                <div className="p-3 bg-[#F6EFFC] rounded-full mt-1">
                  {item.icon}
                </div>
                <div className="pl-1">
                  <h2 className="text-lg font-semibold text-[#5C517B] mb-1">
                    {item.title}
                  </h2>
                  <p className="text-sm text-[#5C517B]">{item.description}</p>
                </div>
              </div>
              <button className="mt-6 py-3 w-full font-semibold rounded-lg shadow transition bg-[#B76EF1] hover:bg-[#974EC3] text-white">
                Manage {item.title}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
