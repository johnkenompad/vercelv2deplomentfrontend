import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FaUserGraduate, FaChalkboardTeacher } from 'react-icons/fa';

const RoleSelection = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate('/login'); // redirect if not logged in
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleRoleSelect = async (role) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { role }, { merge: true });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error setting role:', error);
      alert('Something went wrong.');
    }
  };

  const roles = [
    {
      label: 'Student',
      icon: <FaUserGraduate size={32} />,
      color: 'bg-yellow-400 hover:bg-yellow-500',
      role: 'student',
    },
    {
      label: 'Teacher',
      icon: <FaChalkboardTeacher size={32} />,
      color: 'bg-red-500 hover:bg-red-600',
      role: 'teacher',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-8">
          Choose your account type
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
          {roles.map((r) => (
            <div
              key={r.role}
              onClick={() => handleRoleSelect(r.role)}
              className={`cursor-pointer rounded-xl shadow-lg overflow-hidden transition transform hover:scale-105`}
            >
              <div className={`p-6 flex flex-col items-center justify-center text-white ${r.color}`}>
                {r.icon}
              </div>
              <div className="bg-white py-3 text-gray-800 font-medium">
                {r.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
