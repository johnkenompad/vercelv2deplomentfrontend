import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { auth } from '../../firebase';

const Login = () => {
  // ────────────────────────────────────────
  // ⚙️ Local state
  // ────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const db = getFirestore();

  // ────────────────────────────────────────
  // 🔐 Handle login
  // ────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const { role = '' } = userDocSnap.data();
        const normalizedRole = role.toLowerCase();

        if (!normalizedRole) {
          setLoginError('No role assigned to this account. Please contact support.');
          return;
        }

        localStorage.setItem('userRole', normalizedRole);

        if (normalizedRole === 'teacher') navigate('/dashboard');
        else if (normalizedRole === 'student') navigate('/student-dashboard');
        else if (normalizedRole === 'admin') navigate('/admin-dashboard');
        else setLoginError('Invalid role assigned. Please contact admin.');
      } else {
        setLoginError('User profile not found. Please contact support.');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setLoginError('The email address or password you entered is incorrect.');
    } finally {
      setIsLoading(false);
    }
  };

  // ────────────────────────────────────────
  // 🖼  UI
  // ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6EFFC] flex items-center justify-center px-4 sm:px-6">
      <div className="flex w-full max-w-6xl bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden border border-[#EBD3FA]">
        {/* Illustration (hidden on small) */}
        <div
          className="hidden md:block w-1/2 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/Studying-amico.png')" }}
        />

        {/* Form card */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          {/* Brand */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-[#B76EF1] tracking-tight flex justify-center items-center gap-2">
              <span className="text-[#974EC3] text-2xl">⚡</span> QuizRush
            </h1>
            <p className="text-[#5C517B] text-sm mt-1">AI-Powered Quiz Generator</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error banner */}
            {loginError && (
              <div className="bg-white border border-red-300 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    className="w-4 h-4 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11V5a1 1 0 10-2 0v2a1 1 0 102 0zm0 4a1 1 0 10-2 0v2a1 1 0 102 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold text-red-600">Sign-in failed</span>
                </div>
                <p className="text-xs text-gray-700">{loginError}</p>
              </div>
            )}

            {/* Email */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className={`w-full px-4 py-3 rounded-lg shadow-sm bg-[#F6EFFC] text-[#5C517B] border ${
                loginError ? 'border-red-500' : 'border-[#EBD3FA]'
              } focus:outline-none focus:ring-2 focus:ring-[#B76EF1] transition`}
            />

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className={`w-full px-4 py-3 pr-12 rounded-lg shadow-sm bg-[#F6EFFC] text-[#5C517B] border ${
                  loginError ? 'border-red-500' : 'border-[#EBD3FA]'
                } focus:outline-none focus:ring-2 focus:ring-[#B76EF1] transition`}
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

            {/* Forgot password link */}
            <div className="flex justify-end text-sm">
              <a href="#" className="text-[#974EC3] hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Sign-in button */}
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
                  Logging in…
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center justify-center gap-4">
              <hr className="w-1/4 border-[#EBD3FA]" />
              <span className="text-[#5C517B] text-sm">or</span>
              <hr className="w-1/4 border-[#EBD3FA]" />
            </div>

            {/* Google auth placeholder */}
            <button
              type="button"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 border border-[#EBD3FA] bg-white hover:bg-[#F6EFFC] py-3 rounded-lg transition"
              onClick={() => alert('Google login not yet implemented.')}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="text-sm text-[#5C517B]">Sign in with Google</span>
            </button>

            {/* Sign-up redirect */}
            <p className="text-center text-sm text-[#5C517B]">
              Don’t have an account?{' '}
              <span
                onClick={() => navigate('/register')}
                className="text-[#974EC3] hover:underline cursor-pointer"
              >
                Sign Up
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
