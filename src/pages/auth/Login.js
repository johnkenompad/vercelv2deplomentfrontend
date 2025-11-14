// src/pages/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

const Login = () => {
  /* ─────────────────────────────── State */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  /* ─────────────────────────────── Load saved email */
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  /* ─────────────────────────────── Error map */
  const errorMessages = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled":
      "This account has been disabled. Please contact support.",
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential":
      "Invalid email or password. Please check your credentials.",
    "auth/too-many-requests":
      "Too many failed attempts. Please try again later or reset your password.",
    profile_missing:
      "Profile data missing. Please contact an administrator.",
    role_missing: "Your account has no role assigned. Please contact support.",
    role_invalid: "Unrecognized role. Please contact support.",
    "permission-denied":
      "Insufficient permissions to access your profile. Please contact an administrator.",
  };

  /* ─────────────────────────────── Helpers */
  const redirectByRole = (role) => {
    const lower = (role || "").toLowerCase();
    localStorage.setItem("userRole", lower);
    if (lower === "teacher") navigate("/dashboard");
    else if (lower === "student") navigate("/student-dashboard");
    else if (lower === "admin") navigate("/admin-dashboard");
    else throw new Error("role_invalid");
  };

  /* ─────────────────────────────── Global auth listener
     Ensures Firestore reads only occur once the user is fully authenticated */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return; // not signed in yet

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) throw new Error("profile_missing");

        const role = snap.data().role;
        if (!role) throw new Error("role_missing");

        redirectByRole(role);
      } catch (err) {
        console.error("❌ Auth state error:", err.code || err.message, err);
        const key = err.code || err.message;
        setLoginError(
          errorMessages[key] ||
            "Failed to load your profile. Please try again."
        );
      }
    });

    return () => unsub();
  }, [navigate]);

  /* ─────────────────────────────── Handlers */
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      /* Remember email */
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email.trim());
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      // Redirect will occur in onAuthStateChanged listener once profile is fetched
    } catch (err) {
      console.error("❌ Login error:", err.code || err.message, err);
      const key = err.code || err.message;
      setLoginError(
        errorMessages[key] ||
          "An error occurred during login. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLoginError("");

    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: "student",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        });
        redirectByRole("student");
      } else {
        redirectByRole(snap.data().role);
      }
    } catch (err) {
      console.error("❌ Google login error:", err.code || err.message, err);
      const key = err.code || err.message;
      if (key === "auth/popup-closed-by-user") {
        setLoginError("Sign-in cancelled. Please try again.");
      } else if (key === "auth/popup-blocked") {
        setLoginError("Popup was blocked. Enable popups for this site.");
      } else {
        setLoginError(
          errorMessages[key] ||
            "Failed to sign in with Google. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => navigate("/forgot-password");

  /* ─────────────────────────────── UI */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0F2FF] to-[#D9F0FF] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl">
        {/* Main Card Container */}
        <div className="bg-[#FFFFFF] rounded-2xl shadow-2xl overflow-hidden border border-[#E0E0E0]">
          <div className="flex flex-col lg:flex-row">
            {/* Left Panel - Illustration */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#3399FF] via-[#3399FF] to-[#1A4780] p-12 flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFFFFF] opacity-5 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FFFFFF] opacity-5 rounded-full -ml-24 -mb-24" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-[#FFFFFF] rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div>
                    <h2 className="text-[#FFFFFF] text-2xl font-bold">
                      QuizRush
                    </h2>
                    <p className="text-[#E0F2FF] text-sm">
                      Academic Excellence Platform
                    </p>
                  </div>
                </div>

                <div className="mt-12 space-y-6">
                  {/* Feature 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                      <svg
                        className="w-5 h-5 text-[#FFFFFF]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[#FFFFFF] font-semibold mb-1">
                        Interactive Assessments
                      </h3>
                      <p className="text-[#E0F2FF] text-sm">
                        Create and manage quizzes with real-time analytics
                      </p>
                    </div>
                  </div>
                  {/* Feature 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                      <svg
                        className="w-5 h-5 text-[#FFFFFF]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[#FFFFFF] font-semibold mb-1">
                        Collaborative Learning
                      </h3>
                      <p className="text-[#E0F2FF] text-sm">
                        Connect teachers and students seamlessly
                      </p>
                    </div>
                  </div>
                  {/* Feature 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                      <svg
                        className="w-5 h-5 text-[#FFFFFF]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[#FFFFFF] font-semibold mb-1">
                        Performance Insights
                      </h3>
                      <p className="text-[#E0F2FF] text-sm">
                        Track progress with detailed analytics
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Illustration */}
              <div className="relative z-10 mt-8">
                <img
                  src="/images/Learning-amico.png"
                  alt="Learning illustration"
                  className="w-full h-auto opacity-90 drop-shadow-2xl"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 p-8 sm:p-12">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-[#3399FF] rounded-xl flex items-center justify-center">
                    <span className="text-xl">⚡</span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#3399FF]">
                    QuizRush
                  </h1>
                </div>
                <p className="text-[#666666] text-sm">
                  Academic Excellence Platform
                </p>
              </div>

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-[#2A2A2A] mb-2">
                  Welcome back
                </h2>
                <p className="text-[#555555]">
                  Sign in to access your dashboard
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Error Alert */}
                {loginError && (
                  <div className="bg-[#FFF4F4] border-l-4 border-[#E63946] rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-[#E63946] mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="ml-3">
                        <h3 className="text-sm font-semibold text-[#E63946]">
                          Authentication Failed
                        </h3>
                        <p className="text-sm text-[#E63946] mt-1">
                          {loginError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div>
                  <label className="block text-sm font-semibold text-[#2A2A2A] mb-2">
                    Email Address <span className="text-[#E63946]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E0E0E0] bg-[#FFFFFF] text-[#000000] placeholder-[#666666] focus:outline-none focus:border-[#3399FF] focus:ring-4 focus:ring-[#E8F6FF] transition-all duration-200 disabled:bg-[#FAFAFA] disabled:cursor-not-allowed"
                    placeholder="your.email@institution.edu"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-semibold text-[#2A2A2A] mb-2">
                    Password <span className="text-[#E63946]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-[#E0E0E0] bg-[#FFFFFF] text-[#000000] placeholder-[#666666] focus:outline-none focus:border-[#3399FF] focus:ring-4 focus:ring-[#E8F6FF] transition-all duration-200 disabled:bg-[#FAFAFA] disabled:cursor-not-allowed"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-[#666666] hover:text-[#3399FF] focus:outline-none transition-colors duration-200"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-[#E0E0E0] text-[#3399FF] focus:ring-4 focus:ring-[#E8F6FF] transition-all duration-200"
                    />
                    <span className="text-sm text-[#555555] group-hover:text-[#3399FF] transition-colors duration-200">
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-[#3399FF] hover:text-[#1A4780] font-semibold transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 rounded-xl font-semibold text-base shadow-lg transition-all duration-200 ${
                    isLoading
                      ? "bg-[#666666] cursor-not-allowed text-[#FFFFFF]"
                      : "bg-[#3399FF] hover:bg-[#1A4780] text-[#FFFFFF] shadow-[0_4px_12px_rgba(51,153,255,0.25)] hover:shadow-[0_6px_14px_rgba(51,153,255,0.30)] transform hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <svg
                        className="animate-spin h-5 w-5 text-[#FFFFFF]"
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
                      Signing you in...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </span>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E0E0E0]" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#FFFFFF] text-[#555555] font-medium">
                      or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 border-2 border-[#E0E0E0] bg-[#FFFFFF] hover:bg-[#E8F6FF] hover:border-[#DDDDDD] py-3 rounded-xl transition-all duration-200 disabled:bg-[#FAFAFA] disabled:cursor-not-allowed group"
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-[#2A2A2A] font-semibold group-hover:text-[#1A4780]">
                    Sign in with Google
                  </span>
                </button>

                {/* Sign Up Link */}
                <div className="text-center pt-4">
                  <p className="text-sm text-[#555555]">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      className="text-[#3399FF] hover:text-[#1A4780] font-semibold transition-colors duration-200"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </form>

              {/* Security Badge */}
              <div className="mt-8 pt-6 border-t border-[#F0F0F0]">
                <div className="flex items-center justify-center gap-2 text-xs text-[#666666]">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span>Secure authentication powered by Firebase</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-[#666666]">
          <p>© 2025 QuizRush. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
