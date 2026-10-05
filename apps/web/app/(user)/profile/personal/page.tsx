"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  Globe,
  Bell,
  Camera,
  Copy,
  Check,
  X,
} from "lucide-react";
import { useUser } from "@/components/user-context";

export default function PersonalInformationPage() {
  const router = useRouter();
  const { user, activePlan, theme } = useUser();
  const [profile, setProfile] = useState<{
    firstName?: string | null;
    lastName?: string | null;
    gender?: string | null;
    phone?: string | null;
  } | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const isDark = theme === "dark";

  // Edit Modals
  const [editField, setEditField] = useState<null | "name" | "phone" | "password" | "pin" | "lang">(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);

  useEffect(() => {
    // Fetch profile and PIN status
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setProfile(d.data);
          setFirstName(d.data.firstName || "");
          setLastName(d.data.lastName || "");
          setPhoneNumber(d.data.phone || user?.phone || "");
        }
      })
      .catch(() => {});

    fetch("/api/withdrawal-pin")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.hasPin !== undefined) {
          setHasPin(Boolean(d.data.hasPin));
        }
      })
      .catch(() => {});
  }, [user]);

  const memberTier = activePlan?.planName || "intern";
  const userIdentifier = user?.phone || user?.email?.split("@")[0] || "8128995823";
  const memberCode = user?.referralCode || user?.id?.slice(0, 6).toUpperCase() || "63025";

  const copyMemberId = () => {
    navigator.clipboard.writeText(memberCode);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMsg({ type: "err", text: data.error?.message || "Failed to save profile" });
      } else {
        setProfile((prev) => ({ ...prev, firstName, lastName }));
        setMsg({ type: "ok", text: "Name updated successfully!" });
        setTimeout(() => setEditField(null), 1200);
      }
    } catch {
      setMsg({ type: "err", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMsg({ type: "err", text: data.error?.message || "Failed to save phone number" });
      } else {
        setProfile((prev) => ({ ...prev, phone: phoneNumber }));
        setMsg({ type: "ok", text: "Phone number updated successfully!" });
        setTimeout(() => setEditField(null), 1200);
      }
    } catch {
      setMsg({ type: "err", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const fullNameDisplay =
    profile?.firstName || profile?.lastName
      ? `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim()
      : "Not set";

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* 1. Header with Back Button */}
      <div className="flex items-center justify-between py-1">
        <Link
          href="/profile"
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
            isDark
              ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950"
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1
          className={`text-sm font-black tracking-wide ${
            isDark ? "text-white" : "text-slate-950"
          }`}
        >
          Personal Information
        </h1>
        <div className="w-8" />
      </div>

      {/* 2. User Identity Card */}
      <div
        className={`rounded-3xl border overflow-hidden shadow-md transition-colors ${
          isDark
            ? "bg-slate-900/95 border-slate-800/90 text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Top Decorative Illustration */}
        <div
          className={`relative h-24 p-4 flex items-center justify-end ${
            isDark
              ? "bg-gradient-to-r from-[#002060] via-[#10356c] to-slate-900"
              : "bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
          }`}
        >
          <div
            className={`absolute left-4 top-4 text-[10px] font-bold tracking-widest uppercase ${
              isDark ? "text-white/40" : "text-slate-400"
            }`}
          >
            Official Member Badge
          </div>
          <div
            className={`w-20 h-20 rounded-2xl border flex items-center justify-center shadow-sm ${
              isDark
                ? "bg-white/10 backdrop-blur-md border-white/20 text-[#40b020]"
                : "bg-white/80 backdrop-blur-md border-slate-200 text-[#40b020]"
            }`}
          >
            <ShieldCheck className="w-10 h-10" />
          </div>
        </div>

        {/* User Details */}
        <div className="p-4 pt-0 -mt-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar with Camera Icon */}
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#002060] to-[#40b020] p-[2px] shadow-md flex items-center justify-center">
                <div
                  className={`w-full h-full rounded-full flex items-center justify-center ${
                    isDark ? "bg-[#0a0f1d] text-[#40b020]" : "bg-sky-400 text-white"
                  }`}
                >
                  <User className="w-7 h-7" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert("Avatar customization ready.")}
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border flex items-center justify-center transition ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                    : "bg-slate-900 border-white text-white shadow-xs"
                }`}
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-base font-black font-mono ${
                    isDark ? "text-white" : "text-slate-950"
                  }`}
                >
                  {userIdentifier}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold lowercase ${
                    isDark
                      ? "bg-[#40b020]/20 text-[#40b020] border border-[#40b020]/40"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {memberTier}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                <span>Member ID {memberCode}</span>
                <button
                  type="button"
                  onClick={copyMemberId}
                  className="p-0.5 rounded hover:text-slate-700 dark:hover:text-white text-slate-400 transition"
                  title="Copy Member ID"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-[#40b020]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <ChevronRight
            className={`w-5 h-5 ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          />
        </div>
      </div>

      {/* 3. Account Information Section */}
      <div className="space-y-2">
        <h3
          className={`text-xs font-black px-1 ${
            isDark ? "text-slate-200" : "text-slate-900"
          }`}
        >
          Account Information
        </h3>

        <div
          className={`rounded-2xl border divide-y text-xs shadow-xs transition-colors ${
            isDark
              ? "bg-slate-900/90 border-slate-800/90 divide-slate-800/80 text-white"
              : "bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-sm"
          }`}
        >
          {/* Email */}
          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#40b020]" />
              <span className="font-semibold">Email</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 truncate max-w-[180px]">
                {user?.email || "user@solar.local"}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Phone Number */}
          <div
            onClick={() => {
              setMsg(null);
              setEditField("phone");
            }}
            className={`flex items-center justify-between p-3.5 cursor-pointer transition ${
              isDark ? "hover:bg-slate-850" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-sky-500" />
              <span className="font-semibold">Phone Number</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">
                {profile?.phone || user?.phone || userIdentifier}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Password */}
          <div
            onClick={() => router.push("/profile")}
            className={`flex items-center justify-between p-3.5 cursor-pointer transition ${
              isDark ? "hover:bg-slate-850" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-500" />
              <span className="font-semibold">Password</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono tracking-widest">
                ••••••••
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Two-Factor / Withdrawal PIN */}
          <div
            onClick={() => router.push("/profile")}
            className={`flex items-center justify-between p-3.5 cursor-pointer transition ${
              isDark ? "hover:bg-slate-850" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold">Two-Factor Authentication</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold ${
                  hasPin ? "text-[#40b020]" : "text-slate-400"
                }`}
              >
                {hasPin ? "Protected" : "Off"}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Personal Information Section */}
      <div className="space-y-2 pt-1">
        <h3
          className={`text-xs font-black px-1 ${
            isDark ? "text-slate-200" : "text-slate-900"
          }`}
        >
          Personal Information
        </h3>

        <div
          className={`rounded-2xl border divide-y text-xs shadow-xs transition-colors ${
            isDark
              ? "bg-slate-900/90 border-slate-800/90 divide-slate-800/80 text-white"
              : "bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-sm"
          }`}
        >
          {/* Full Name */}
          <div
            onClick={() => {
              setMsg(null);
              setEditField("name");
            }}
            className={`flex items-center justify-between p-3.5 cursor-pointer transition ${
              isDark ? "hover:bg-slate-850" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#40b020]" />
              <span className="font-semibold">Full Name</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">
                {fullNameDisplay}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Preferences Section */}
      <div className="space-y-2 pt-1">
        <h3
          className={`text-xs font-black px-1 ${
            isDark ? "text-slate-200" : "text-slate-900"
          }`}
        >
          Preferences
        </h3>

        <div
          className={`rounded-2xl border divide-y text-xs shadow-xs transition-colors ${
            isDark
              ? "bg-slate-900/90 border-slate-800/90 divide-slate-800/80 text-white"
              : "bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-sm"
          }`}
        >
          {/* Language */}
          <div
            onClick={() => setEditField("lang")}
            className={`flex items-center justify-between p-3.5 cursor-pointer transition ${
              isDark ? "hover:bg-slate-850" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-cyan-500" />
              <span className="font-semibold">Language</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">English</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold">Push Notifications</span>
            </div>
            <span className="text-[11px] font-bold text-[#40b020]">Enabled</span>
          </div>
        </div>
      </div>

      {/* ================= EDIT MODALS ================= */}

      {/* Edit Full Name Modal */}
      {editField === "name" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in border ${
              isDark
                ? "bg-[#0f172a] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div
              className={`flex items-center justify-between pb-2 border-b ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <h3 className="text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-[#40b020]" /> Update Full Name
              </h3>
              <button
                onClick={() => setEditField(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveName} className="space-y-3">
              {msg && (
                <div
                  className={`p-2 rounded-xl text-[11px] ${
                    msg.type === "err"
                      ? "bg-red-500/20 text-red-500"
                      : "bg-[#40b020]/20 text-[#40b020]"
                  }`}
                >
                  {msg.text}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#40b020] border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#40b020] border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#40b020] hover:bg-[#389c1c] text-slate-950 font-black text-xs transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Name"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Phone Number Modal */}
      {editField === "phone" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in border ${
              isDark
                ? "bg-[#0f172a] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div
              className={`flex items-center justify-between pb-2 border-b ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#40b020]" /> Update Phone Number
              </h3>
              <button
                onClick={() => setEditField(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePhone} className="space-y-3">
              {msg && (
                <div
                  className={`p-2 rounded-xl text-[11px] ${
                    msg.type === "err"
                      ? "bg-red-500/20 text-red-500"
                      : "bg-[#40b020]/20 text-[#40b020]"
                  }`}
                >
                  {msg.text}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 08128995823"
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#40b020] hover:bg-[#389c1c] text-slate-950 font-black text-xs transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Phone Number"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Language Picker Modal */}
      {editField === "lang" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-3 animate-scale-in border ${
              isDark
                ? "bg-[#0f172a] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div
              className={`flex items-center justify-between pb-2 border-b ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#40b020]" /> Language Preferences
              </h3>
              <button
                onClick={() => setEditField(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1 text-xs">
              {["English", "Hausa", "Yorùbá", "Igbo", "Français"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setEditField(null)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition ${
                    l === "English"
                      ? "bg-[#40b020]/20 text-[#40b020] border border-[#40b020]/40 font-bold"
                      : isDark
                      ? "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{l}</span>
                  {l === "English" && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
