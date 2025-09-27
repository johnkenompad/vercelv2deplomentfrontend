import React from 'react';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-100 min-h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
