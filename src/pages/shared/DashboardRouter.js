import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

import StudentDashboard from '../student/StudentDashboard';
import TeacherDashboard from '../teacher/TeacherDashboard';

const DashboardRouter = () => {
  const [role, setRole] = useState(localStorage.getItem('userRole') || null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          return;
        }

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const { role } = userSnap.data();
          if (role === 'teacher' || role === 'student') {
            setRole(role);
            localStorage.setItem('userRole', role);
          } else {
            navigate('/select-role');
          }
        } else {
          navigate('/select-role');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        navigate('/login');
      }
    };

    fetchUserRole();
  }, [navigate]);

  if (role === 'teacher') return <TeacherDashboard />;
  if (role === 'student') return <StudentDashboard />;

  // Optional fallback
  return (
    <div className="p-6 text-center text-red-600">
      <h2>❌ Unknown role</h2>
      <p>Please contact support or reselect your role.</p>
      <a href="/select-role" className="text-blue-600 underline">Go to Role Selection</a>
    </div>
  );
};

export default DashboardRouter;
