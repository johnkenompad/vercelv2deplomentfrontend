import React from 'react';
import { useNavigate } from 'react-router-dom';

const SelectRole = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    localStorage.setItem('userRole', role); // optional: store role locally

    if (role === 'student') {
      navigate('/dashboard'); // Make sure this route exists
    } else if (role === 'teacher') {
      navigate('/teacher-dashboard'); // Make sure this route exists
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96 text-center">
        <h2 className="text-2xl font-semibold mb-6">Choose your role</h2>
        <button
          onClick={() => handleRoleSelect('student')}
          className="bg-blue-500 text-white w-full py-2 rounded mb-4 hover:bg-blue-600"
        >
          I'm a Student
        </button>
        <button
          onClick={() => handleRoleSelect('teacher')}
          className="bg-green-500 text-white w-full py-2 rounded hover:bg-green-600"
        >
          I'm a Teacher
        </button>
      </div>
    </div>
  );
};

export default SelectRole;
