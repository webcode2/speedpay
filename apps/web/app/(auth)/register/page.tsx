"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Globe, RotateCw } from "lucide-react";

function generateCaptcha(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCaptchaCode(generateCaptcha());
    const ref = searchParams.get("ref") || searchParams.get("code") || searchParams.get("invite");
    if (ref) {
      setInviteCode(ref.trim().toUpperCase());
    }
  }, [searchParams]);

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (password.length < 7) {
      setError("Password must be at least 7 characters.");
      return;
    }
    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      setError("Captcha code does not match. Please try again.");
      refreshCaptcha();
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password,
          inviteCode: inviteCode.trim() ? inviteCode.trim() : undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || "Failed to create account.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen sm:min-h-[700px] bg-white">
      {/* 1. Hero Image Banner */}
      <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-slate-900 select-none">
        <Image
          src="/images/auth_night_resort.jpg"
          alt="Night resort pool"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />

        {/* Top-Right Language Globe Button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-md border border-white/25 flex items-center justify-center text-white/90 hover:bg-black/40 hover:text-white transition active:scale-95"
            title="Language"
            onClick={() => alert("English is currently selected.")}
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Banner Branding & Titles */}
        <div className="absolute bottom-9 left-5 right-5 z-10 text-white">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-5 h-5 rounded-md bg-black/70 border border-white/30 flex items-center justify-center">
              <span className="text-[9px] font-black tracking-tighter text-white">SR</span>
            </div>
            <span className="text-[12px] font-bold tracking-tight text-white/95 drop-shadow">
              SPEED PAY Corp
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">
            Create account
          </h1>
        </div>
      </div>

      {/* 2. White Card Form (Overlapping Banner) */}
      <div className="relative -mt-6 rounded-t-[32px] bg-white px-6 pt-6 pb-8 flex-1 flex flex-col justify-between z-20 shadow-[-4px_-8px_24px_rgba(0,0,0,0.06)]">
        <div>
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2 animate-shake">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Phone Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phone
              </label>
              <div className="flex items-center rounded-2xl bg-[#f5f6f8] border border-transparent focus-within:border-slate-300 focus-within:bg-white transition px-4 py-3 shadow-sm">
                <span className="font-bold text-slate-900 text-sm select-none pr-3">
                  +234
                </span>
                <span className="h-4 w-[1px] bg-slate-300 mr-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="bg-transparent flex-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email
              </label>
              <div className="flex items-center rounded-2xl bg-[#f5f6f8] border border-transparent focus-within:border-slate-300 focus-within:bg-white transition px-4 py-3 shadow-sm">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-transparent flex-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="flex items-center rounded-2xl bg-[#f5f6f8] border border-transparent focus-within:border-slate-300 focus-within:bg-white transition px-4 py-3 shadow-sm">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={7}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min 7 chars)"
                  className="bg-transparent flex-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition pl-2 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Invite Code Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Invite code
              </label>
              <div className="flex items-center rounded-2xl bg-[#f5f6f8] border border-transparent focus-within:border-slate-300 focus-within:bg-white transition px-4 py-3 shadow-sm">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  className="bg-transparent flex-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium uppercase tracking-wider"
                />
              </div>
            </div>

            {/* Captcha Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Captcha
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  required
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Enter captcha"
                  maxLength={6}
                  className="flex-1 rounded-2xl bg-[#f5f6f8] border border-transparent focus:border-slate-300 focus:bg-white transition px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium shadow-sm uppercase tracking-wider"
                />

                {/* Styled Captcha Badge */}
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  title="Click to refresh captcha"
                  className="h-12 w-32 rounded-2xl bg-gradient-to-r from-[#eef2f8] via-[#e5ecf6] to-[#edf3fa] border border-slate-300/80 flex items-center justify-center font-serif text-lg tracking-[0.25em] font-black text-[#1b264f] shadow-inner select-none cursor-pointer relative overflow-hidden group active:scale-95 transition"
                >
                  {/* Decorative background noise lines */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#2a3b75_1px,transparent_1px)] [background-size:6px_6px]" />
                  <span className="relative z-10 drop-shadow-sm transform skew-x-3 italic">
                    {captchaCode || "JZCRF"}
                  </span>
                  <RotateCw className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition" />
                </button>
              </div>
            </div>

            {/* Register Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-md bg-[#181b22] hover:bg-black text-white cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block animate-pulse">Creating account...</span>
                ) : (
                  "Register"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 3. Footer Links */}
        <div className="pt-5 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-slate-900 hover:underline"
            >
              Log in
            </Link>
          </p>

          <div className="flex items-center justify-center gap-2 mt-3 text-[11px] font-medium text-slate-400">
            <Link href="/support" className="hover:text-slate-700 transition">
              Terms
            </Link>
            <span>·</span>
            <Link href="/support" className="hover:text-slate-700 transition">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <RegisterForm />
    </Suspense>
  );
}
