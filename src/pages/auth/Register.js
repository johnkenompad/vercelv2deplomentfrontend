import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getFirestore, serverTimestamp } from 'firebase/firestore';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  // ────────────────────────────────────────
  // ⚙️ Local state
  // ────────────────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const db = getFirestore();

  // ────────────────────────────────────────
  // 🔐 Handle registration
  // ────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        email: user.email,
        role,
        createdAt: serverTimestamp(),
      });

      localStorage.setItem('userRole', role);
      navigate(role === 'teacher' ? '/dashboard' : '/student-dashboard');
    } catch (err) {
      console.error('❌ Registration Error:', err);
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ────────────────────────────────────────
  // 🖼  UI
  // ────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6EFFC] px-4 sm:px-6">
      <div className="flex w-full max-w-6xl bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden border border-[#EBD3FA]">
        {/* Illustration (hidden on small) */}
        <div
          className="hidden md:block md:w-1/2 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/Book-lover-amico.png')",
          }}
        />

        {/* Form card */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          {/* Brand */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-[#B76EF1] tracking-tight flex justify-center items-center gap-2">
              <span className="text-[#974EC3] text-2xl">⚡</span> QuizRush
            </h1>
            <p className="text-[#5C517B] text-sm mt-1">Create your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-6">
            {/* Name */}
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg shadow-sm bg-[#F6EFFC] text-[#5C517B] border border-[#EBD3FA] focus:outline-none focus:ring-2 focus:ring-[#B76EF1] transition"
            />

            {/* Email */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg shadow-sm bg-[#F6EFFC] text-[#5C517B] border border-[#EBD3FA] focus:outline-none focus:ring-2 focus:ring-[#B76EF1] transition"
            />

            {/* Password + toggle */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 pr-12 rounded-lg shadow-sm bg-[#F6EFFC] text-[#5C517B] border border-[#EBD3FA] focus:outline-none focus:ring-2 focus:ring-[#B76EF1] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-[#974EC3] hover:text-[#B76EF1] focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  // Eye open
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12C3.5 7 7.5 4 12 4s8.5 3 11 8c-2.5 5-6.5 8-11 8s-8.5-3-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  // Eye slash
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12C3.5 7 7.5 4 12 4s8.5 3 11 8c-2.5 5-6.5 8-11 8s-8.5-3-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="4" y1="4" x2="20" y2="20" stroke="#974EC3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Role select */}
            <div>
              <label className="block text-sm font-medium text-[#5C517B] mb-1">
                Select Role:
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 rounded-lg bg-white text-[#5C517B] border border-[#EBD3FA] focus:outline-none focus:ring-2 focus:ring-[#B76EF1] transition"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-semibold shadow transition ${
                isLoading
                  ? 'bg-[#B76EF1]/70 cursor-not-allowed'
                  : 'bg-[#B76EF1] hover:bg-[#974EC3] text-white'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Creating…
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Sign-in redirect */}
            <p className="text-center text-sm text-[#5C517B]">
              Already have an account?{' '}
              <span
                onClick={() => navigate('/login')}
                className="text-[#974EC3] hover:underline cursor-pointer"
              >
                Sign In
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
