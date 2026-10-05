"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Globe } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please enter your phone number");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message || "Invalid phone number or password");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFormFilled = phone.trim().length > 0 && password.length > 0;

  return (
    <div className="flex flex-col min-h-screen sm:min-h-[640px] bg-white">
      {/* 1. Hero Image Banner */}
      <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-900 select-none">
        <Image
          src="/images/auth_day_resort.jpg"
          alt="Resort landscape"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Subtle top & bottom vignette */}
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
            Welcome back
          </h1>
          <p className="text-xs font-medium text-white/85 mt-1 drop-shadow">
            Sign in to discover, stay, and review
          </p>
        </div>
      </div>

      {/* 2. White Card Form (Overlapping Banner) */}
      <div className="relative -mt-6 rounded-t-[32px] bg-white px-6 pt-7 pb-8 flex-1 flex flex-col justify-between z-20 shadow-[-4px_-8px_24px_rgba(0,0,0,0.06)]">
        <div>
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2 animate-shake">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phone
              </label>
              <div className="flex items-center rounded-2xl bg-[#f5f6f8] border border-transparent focus-within:border-slate-300 focus-within:bg-white transition px-4 py-3.5 shadow-sm">
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

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="flex items-center rounded-2xl bg-[#f5f6f8] border border-transparent focus-within:border-slate-300 focus-within:bg-white transition px-4 py-3.5 shadow-sm">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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

            {/* Log in Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 ${
                  isFormFilled
                    ? "bg-[#1e2026] hover:bg-black text-white cursor-pointer shadow-slate-900/10"
                    : "bg-[#71767e] hover:bg-[#60656d] text-white cursor-pointer"
                }`}
              >
                {loading ? (
                  <span className="inline-block animate-pulse">Logging in...</span>
                ) : (
                  "Log in"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 3. Footer Links */}
        <div className="pt-6 text-center">
          <p className="text-xs text-slate-500 font-medium">
            No account yet?{" "}
            <Link
              href="/register"
              className="font-bold text-slate-900 hover:underline"
            >
              Register
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
