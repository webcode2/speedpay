"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || "Failed to process request.");
        return;
      }

      if (data.data?.resetToken) {
        setResetToken(data.data.resetToken);
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-xl">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#002060] to-[#40b020] text-white mb-3 shadow-lg shadow-[#40b020]/25">
          <Zap className="w-7 h-7 fill-current" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          Reset Password
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Enter your email and we&apos;ll send you password reset instructions
        </p>
      </div>

      {submitted ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#40b020]/20 text-[#40b020] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm text-slate-200">
            If an account exists for <span className="font-semibold text-white">{email}</span>, password reset instructions have been issued.
          </p>

          {resetToken && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-[#40b020]/40 text-left space-y-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Direct Reset Link (Dev Mode)
              </span>
              <div className="font-mono text-xs text-[#40b020] break-all bg-slate-950 p-2 rounded-lg border border-slate-800">
                {resetToken}
              </div>
              <Link
                href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                className="inline-flex w-full items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#40b020] hover:bg-[#50b020] text-slate-950 font-bold text-xs transition"
              >
                Proceed to Reset Password →
              </Link>
            </div>
          )}

          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-[#40b020] font-semibold hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#40b020] focus:ring-1 focus:ring-[#40b020] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#40b020] to-[#50b020] text-slate-950 font-bold text-sm hover:opacity-95 transition flex items-center justify-center gap-2 shadow-lg shadow-[#40b020]/25 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Send Reset Link"}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
