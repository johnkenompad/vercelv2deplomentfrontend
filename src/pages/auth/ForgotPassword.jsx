/* --------------------------------------------------------------------------
   ForgotPassword.jsx – vivid-blue “Reset Password” page
   • Full Firebase password-reset flow
   • 60-second cooldown (rate limiting)
   • Detailed error + success feedback
   • Matches Login.jsx design system
---------------------------------------------------------------------------*/
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

export default function ForgotPassword() {
  /* ───────── state ───────── */
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" }); // "success" | "error"
  const [secondsLeft, setSecondsLeft] = useState(0);              // cooldown timer
  const timerRef = useRef(null);
  const navigate = useNavigate();

  /* ───────── cooldown ticker ───────── */
  useEffect(() => {
    if (secondsLeft === 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [secondsLeft]);

  /* ───────── handlers ───────── */
  const handleReset = async (e) => {
    e.preventDefault();
    if (secondsLeft > 0) return;

    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await sendPasswordResetEmail(auth, email.trim());

      // start 60-s cooldown
      setSecondsLeft(60);
      timerRef.current = setInterval(
        () => setSecondsLeft((s) => s - 1),
        1000,
      );

      setMessage({
        type: "success",
        text: "Password reset email sent! Check your inbox (and spam).",
      });
    } catch (err) {
      console.error("🔐 reset-pw error:", err);
      let msg = "Unable to send reset email. Please try again.";
      switch (err.code) {
        case "auth/invalid-email":
          msg = "Please enter a valid email address.";
          break;
        case "auth/user-not-found":
          msg = "No account found with this email.";
          break;
        case "auth/too-many-requests":
          msg =
            "Too many requests. Please wait a minute before trying again.";
          break;
        default:
          // keep generic
          break;
      }
      setMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  /* ───────── ui ───────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0F2FF] to-[#D9F0FF] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl">
        <div className="bg-[#FFFFFF] rounded-2xl shadow-2xl overflow-hidden border border-[#E0E0E0]">
          <div className="flex flex-col lg:flex-row">
            {/* Left panel (illustration) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#3399FF] via-[#3399FF] to-[#1A4780] p-12 flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFFFFF] opacity-5 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FFFFFF] opacity-5 rounded-full -ml-24 -mb-24" />
              <img
                src="/images/Thesis-pana.png"
                alt="Forgot password illustration"
                className="relative z-10 w-full h-auto opacity-90 drop-shadow-2xl"
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>

            {/* Right panel (form) */}
            <div className="w-full lg:w-1/2 p-8 sm:p-12">
              {/* Mobile logo */}
              <div className="lg:hidden text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-[#3399FF] rounded-xl flex items-center justify-center">
                    <span className="text-xl">⚡</span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#3399FF]">QuizRush</h1>
                </div>
                <p className="text-[#666666] text-sm">
                  Academic Excellence Platform
                </p>
              </div>

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-[#2A2A2A] mb-2">
                  Forgot your password?
                </h2>
                <p className="text-[#555555]">
                  Enter the email you used when registering and we’ll send you a
                  link to reset it.
                </p>
              </div>

              {/* Alerts */}
              {message.text && (
                <div
                  className={`${
                    message.type === "success"
                      ? "bg-[#CFFDF1] border-l-4 border-[#1E5F23] text-[#1E5F23]"
                      : "bg-[#FFF4F4] border-l-4 border-[#E63946] text-[#E63946]"
                  } rounded-lg p-4 mb-6 animate-in slide-in-from-top-2 duration-300`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleReset} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#2A2A2A] mb-2"
                  >
                    Email address <span className="text-[#E63946]">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#E0E0E0] bg-[#FFFFFF] text-[#000000] placeholder-[#666666] focus:outline-none focus:border-[#3399FF] focus:ring-4 focus:ring-[#E8F6FF] transition-all duration-200 disabled:bg-[#FAFAFA] disabled:cursor-not-allowed"
                    placeholder="your.email@institution.edu"
                    aria-label="Email address"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || secondsLeft > 0}
                  className={`w-full py-3.5 rounded-xl font-semibold text-base shadow-lg transition-all duration-200 ${
                    isLoading || secondsLeft > 0
                      ? "bg-[#666666] cursor-not-allowed text-[#FFFFFF]"
                      : "bg-[#3399FF] hover:bg-[#1A4780] text-[#FFFFFF] shadow-[0_4px_12px_rgba(51,153,255,0.25)] hover:shadow-[0_6px_14px_rgba(51,153,255,0.30)] transform hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                  aria-disabled={isLoading || secondsLeft > 0}
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
                      Sending...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {secondsLeft > 0
                        ? `Retry in ${secondsLeft}s`
                        : "Send Reset Link"}
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

                {/* Back to login */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-sm text-[#3399FF] hover:text-[#1A4780] font-semibold transition-colors duration-200"
                  >
                    Back to Login
                  </button>
                </div>
              </form>

              {/* Security badge */}
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span>Secure authentication powered by Firebase</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="text-center mt-6 text-sm text-[#666666]">
          <p>© 2025 QuizRush. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
