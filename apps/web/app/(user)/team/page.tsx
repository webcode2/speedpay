"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  User,
  UserPlus,
  UserCheck,
  RotateCw,
  Shield,
  ChevronRight,
  ChevronDown,
  Share2,
  HelpCircle,
  X,
  Copy,
  Check,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { useUser } from "@/components/user-context";

type TeamMember = {
  id: string;
  email: string;
  level: "A" | "B" | "C";
  accountStatus: string;
  createdAt: string;
};

type TeamData = {
  referralCode: string;
  referredBy: { id: string; email: string } | null;
  referringStatus: string;
  overview: {
    totalMembers: number;
    newMembers: number;
    activeMembers: number;
    directReferrals: number;
  };
  levels: {
    A: number;
    B: number;
    C: number;
  };
  members: TeamMember[];
  subscribedDirect: number;
};

export default function TeamPage() {
  const { user, wallet, activePlan, theme } = useUser();
  const isDark = theme === "dark";
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [periodFilter, setPeriodFilter] = useState<"month" | "week" | "today" | "all">("month");
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<"ALL" | "A" | "B" | "C">("ALL");

  // Copy state
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralCode = user?.referralCode || teamData?.referralCode || "";
  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${referralCode}`
      : `https://speedpay.app/register?ref=${referralCode}`;

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.team) {
          setTeamData(d.data.team);
        }
      })
      .catch(() => {});
  }, []);

  const copyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareWhatsapp = () => {
    const text = encodeURIComponent(
      `Join my Speed Pay team and start earning daily solar task rewards! Register here: ${referralLink}`,
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const allMembers: TeamMember[] = teamData?.members || [];
  const totalMembersCount = teamData?.overview?.totalMembers ?? allMembers.length;
  const newMembersCount = teamData?.overview?.newMembers ?? 0;
  const activeMembersCount = teamData?.overview?.activeMembers ?? teamData?.subscribedDirect ?? 0;
  const totalCommission = wallet?.totalCommission ?? 0;

  const countA = teamData?.levels?.A ?? allMembers.filter((m) => m.level === "A").length;
  const countB = teamData?.levels?.B ?? allMembers.filter((m) => m.level === "B").length;
  const countC = teamData?.levels?.C ?? allMembers.filter((m) => m.level === "C").length;

  const filteredMembers =
    selectedLevelFilter === "ALL"
      ? allMembers
      : allMembers.filter((m) => m.level === selectedLevelFilter);

  // VIP next level progress
  const currentPlanName = activePlan?.planName || "intern";
  const isIntern = !activePlan || currentPlanName.toLowerCase().includes("intern");
  const nextPlanName = isIntern ? "VIP-1" : "VIP-2";
  const nextPlanPrice = isIntern ? 12000 : 54000;

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      {/* 1. Top Header Bar */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="w-8" />
        <h1
          className={`text-base sm:text-lg font-black tracking-tight ${
            isDark ? "text-white" : "text-slate-950"
          }`}
        >
          My Team
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/invite"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isDark
                ? "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title="Share Referral"
          >
            <Share2 className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isDark
                ? "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
            title="Team Help & Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. "Build Your Team" Hero Card */}
      <div
        className={`p-5 rounded-3xl border relative overflow-hidden transition ${
          isDark
            ? "bg-[#0f172a] border-slate-800 text-white"
            : "bg-[#f8fafc] border-slate-200/90 text-slate-900 shadow-xs"
        }`}
      >
        <div className="flex items-start justify-between relative z-10">
          <div className="max-w-[240px] space-y-1">
            <h2
              className={`text-base font-black tracking-tight ${
                isDark ? "text-white" : "text-slate-950"
              }`}
            >
              Build Your Team
            </h2>
            <p
              className={`text-xs leading-relaxed ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Invite friends, earn rewards, and grow together!
            </p>
            <div className="pt-2">
              <Link
                href="/invite"
                className={`py-2 px-4 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  isDark
                    ? "bg-[#1e293b] hover:bg-[#334155] text-white border border-slate-700"
                    : "bg-[#0f172a] hover:bg-slate-800 text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-[#40b020]" />
                <span>Invite Friends</span>
              </Link>
            </div>
          </div>

          {/* People Illustration Right */}
          <div className="shrink-0 pt-1">
            <div
              className={`w-16 h-14 rounded-2xl flex items-center justify-center ${
                isDark ? "bg-slate-800/80 text-slate-600" : "bg-slate-200/70 text-slate-400"
              }`}
            >
              <Users className="w-8 h-8 opacity-70" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Team Overview Card with 4 Circular Stats */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border space-y-4 ${
          isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200/90 text-slate-900 shadow-sm"
        }`}
      >
        {/* Header with period dropdown */}
        <div className="flex items-center justify-between relative">
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
            Team Overview
          </h3>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition ${
                isDark
                  ? "border-slate-800 text-slate-400 hover:text-white bg-slate-900/60"
                  : "border-slate-200 text-slate-600 hover:text-slate-950 bg-slate-50"
              }`}
            >
              <span>
                {periodFilter === "month"
                  ? "This Month"
                  : periodFilter === "week"
                  ? "This Week"
                  : periodFilter === "today"
                  ? "Today"
                  : "All Time"}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showPeriodDropdown && (
              <div
                className={`absolute right-0 top-full mt-1.5 z-20 w-32 rounded-2xl border shadow-xl py-1 text-xs animate-scale-in ${
                  isDark
                    ? "bg-[#0f172a] border-slate-800 text-slate-300"
                    : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                {[
                  { id: "month", label: "This Month" },
                  { id: "week", label: "This Week" },
                  { id: "today", label: "Today" },
                  { id: "all", label: "All Time" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setPeriodFilter(item.id as "month" | "week" | "today" | "all");
                      setShowPeriodDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 transition flex items-center justify-between ${
                      periodFilter === item.id
                        ? "text-[#40b020] font-bold bg-[#40b020]/10"
                        : isDark
                        ? "hover:bg-slate-800"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    {periodFilter === item.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4 Circular Stat Badges Grid */}
        <div className="grid grid-cols-4 gap-2 text-center pt-1">
          {/* Total Members */}
          <div className="flex flex-col items-center">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${
                isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <div className={`text-base font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              {totalMembersCount}
            </div>
            <div className={`text-[10px] mt-0.5 leading-tight ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Total Members
            </div>
          </div>

          {/* New Members */}
          <div className="flex flex-col items-center">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${
                isDark ? "bg-sky-500/15 text-sky-400" : "bg-sky-50 text-sky-500"
              }`}
            >
              <UserPlus className="w-5 h-5" />
            </div>
            <div className={`text-base font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              {newMembersCount}
            </div>
            <div className={`text-[10px] mt-0.5 leading-tight ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              New Members
            </div>
          </div>

          {/* Active Members */}
          <div className="flex flex-col items-center">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${
                isDark ? "bg-emerald-500/15 text-[#40b020]" : "bg-emerald-50 text-[#40b020]"
              }`}
            >
              <UserCheck className="w-5 h-5" />
            </div>
            <div className={`text-base font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              {activeMembersCount}
            </div>
            <div className={`text-[10px] mt-0.5 leading-tight ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Active Members
            </div>
          </div>

          {/* Team Earnings */}
          <div className="flex flex-col items-center">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 ${
                isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-600"
              }`}
            >
              <RotateCw className="w-5 h-5" />
            </div>
            <div className="text-base font-black tracking-tight text-[#40b020]">
              {Number(totalCommission).toFixed(2)}
            </div>
            <div className={`text-[10px] mt-0.5 leading-tight ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Team Earnings
            </div>
          </div>
        </div>
      </div>

      {/* 4. VIP Level Upgrade Status Card */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border relative space-y-3 ${
          isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200/90 text-slate-900 shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black capitalize ${isDark ? "text-white" : "text-slate-950"}`}>
                  {currentPlanName}
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Keep growing! Next level is {nextPlanName}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowBenefitsModal(true)}
            className="text-xs font-semibold text-slate-500 hover:text-[#40b020] flex items-center gap-0.5 transition"
          >
            <span>Level Benefits</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={isDark ? "text-slate-400" : "text-slate-600"}>
              Level price NGN {Number(nextPlanPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Progress Bar */}
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
            <div
              className="h-full bg-slate-300 dark:bg-slate-600 rounded-full"
              style={{ width: isIntern ? "15%" : "60%" }}
            />
          </div>

          <p className={`text-[10px] leading-relaxed pt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Buy NGN {Number(nextPlanPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })} to reach {nextPlanName}. Current level fee is refunded after upgrade
          </p>
        </div>
      </div>

      {/* 5. Team Performance Card (4 columns) */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border space-y-3.5 ${
          isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200/90 text-slate-900 shadow-sm"
        }`}
      >
        <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
          Team Performance
        </h3>

        <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 text-center">
          {/* New Members */}
          <div className="px-1">
            <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              New Members
            </div>
            <div className={`text-sm font-black mt-1 ${isDark ? "text-white" : "text-slate-950"}`}>
              {newMembersCount}
            </div>
          </div>

          {/* Upgrades */}
          <div className="px-1">
            <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Upgrades
            </div>
            <div className={`text-sm font-black mt-1 ${isDark ? "text-white" : "text-slate-950"}`}>
              {activeMembersCount}
            </div>
          </div>

          {/* Period Deposits */}
          <div className="px-1">
            <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Period Deposits
            </div>
            <div className={`text-sm font-black mt-1 ${isDark ? "text-white" : "text-slate-950"}`}>
              0.00
            </div>
          </div>

          {/* Est. Commission */}
          <div className="px-1">
            <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Est. Commission
            </div>
            <div className={`text-sm font-black mt-1 text-[#40b020]`}>
              {Number(totalCommission).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Team Structure Card */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border space-y-3.5 ${
          isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200/90 text-slate-900 shadow-sm"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
            Team Structure
          </h3>
          <button
            type="button"
            onClick={() => setShowAllMembersModal(true)}
            className="text-xs font-semibold text-slate-400 hover:text-[#40b020] transition"
          >
            See all
          </button>
        </div>

        {/* Today's Commission Row */}
        <div
          className={`p-3 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            isDark ? "bg-slate-900/90 text-slate-300" : "bg-slate-50 text-slate-700"
          }`}
        >
          <span>Today&apos;s Commission</span>
          <span className={`font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
            NGN 0.00
          </span>
        </div>

        {/* Level A, B, C Rows */}
        <div className="space-y-2.5 pt-1">
          {/* Level A */}
          <div
            onClick={() => {
              setSelectedLevelFilter("A");
              setShowAllMembersModal(true);
            }}
            className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
              isDark
                ? "border-slate-800/80 hover:bg-slate-800/40"
                : "border-slate-100 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-950 dark:bg-slate-800 text-white text-xs font-black flex items-center justify-center">
                A
              </div>
              <span className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                {countA}
              </span>
            </div>
            <span className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
              NGN 0.00
            </span>
          </div>

          {/* Level B */}
          <div
            onClick={() => {
              setSelectedLevelFilter("B");
              setShowAllMembersModal(true);
            }}
            className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
              isDark
                ? "border-slate-800/80 hover:bg-slate-800/40"
                : "border-slate-100 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-950 dark:bg-slate-800 text-white text-xs font-black flex items-center justify-center">
                B
              </div>
              <span className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                {countB}
              </span>
            </div>
            <span className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
              NGN 0.00
            </span>
          </div>

          {/* Level C */}
          <div
            onClick={() => {
              setSelectedLevelFilter("C");
              setShowAllMembersModal(true);
            }}
            className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
              isDark
                ? "border-slate-800/80 hover:bg-slate-800/40"
                : "border-slate-100 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-950 dark:bg-slate-800 text-white text-xs font-black flex items-center justify-center">
                C
              </div>
              <span className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                {countC}
              </span>
            </div>
            <span className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
              NGN 0.00
            </span>
          </div>
        </div>
      </div>

      {/* 7. Top Members Section */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border space-y-3 ${
          isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200/90 text-slate-900 shadow-sm"
        }`}
      >
        <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
          Top Members
        </h3>

        {allMembers.length === 0 ? (
          <div className={`text-center py-6 text-xs ${isDark ? "text-slate-400" : "text-slate-400"}`}>
            No team members yet
          </div>
        ) : (
          <div className={`divide-y ${isDark ? "divide-slate-800" : "divide-slate-100"}`}>
            {allMembers.slice(0, 5).map((m, idx) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#40b020]/20 text-[#40b020] font-bold text-[11px] flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{m.email}</div>
                    <div className="text-[10px] text-slate-400">Level {m.level} Member</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#40b020]/15 text-[#40b020]">
                  {m.accountStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Invite Friends Drawer */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in border ${
              isDark ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#40b020]" /> Invite Friends
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Referral Code */}
            <div className={`p-3.5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <span className={`text-[10px] font-semibold uppercase block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Your Invite Code
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-mono font-black text-[#40b020]">
                  {referralCode || "------"}
                </span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="py-1.5 px-3 rounded-xl bg-[#40b020] text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div className={`p-3.5 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <span className={`text-[10px] font-semibold uppercase block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Direct Registration Link
              </span>
              <div className={`text-xs font-mono truncate mt-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                {referralLink}
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition ${
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 text-white"
                      : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-xs"
                  }`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#40b020]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Link Copied" : "Copy Link"}</span>
                </button>
                <button
                  type="button"
                  onClick={shareWhatsapp}
                  className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            <p className={`text-[11px] text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Earn up to 10% instant commission when your invited friends subscribe!
            </p>
          </div>
        </div>
      )}

      {/* MODAL 2: Level Benefits Drawer */}
      {showBenefitsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in border ${
              isDark ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#40b020]" /> Level Commission Benefits
              </h3>
              <button
                onClick={() => setShowBenefitsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Level A */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isDark ? "bg-slate-900/90 border-slate-800" : "bg-emerald-50/50 border-emerald-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#40b020] text-slate-950 font-black text-xs flex items-center justify-center">
                    A
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                      Direct Referrals (Level A)
                    </div>
                    <div className="text-[10px] text-slate-400">Your personally invited friends</div>
                  </div>
                </div>
                <span className="text-sm font-black text-[#40b020]">10%</span>
              </div>

              {/* Level B */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isDark ? "bg-slate-900/90 border-slate-800" : "bg-sky-50/50 border-sky-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    B
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                      2nd Tier (Level B)
                    </div>
                    <div className="text-[10px] text-slate-400">Invited by your Level A team</div>
                  </div>
                </div>
                <span className="text-sm font-black text-sky-500">2%</span>
              </div>

              {/* Level C */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isDark ? "bg-slate-900/90 border-slate-800" : "bg-amber-50/50 border-amber-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    C
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                      3rd Tier (Level C)
                    </div>
                    <div className="text-[10px] text-slate-400">Invited by your Level B team</div>
                  </div>
                </div>
                <span className="text-sm font-black text-amber-500">1%</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/packages"
                onClick={() => setShowBenefitsModal(false)}
                className="w-full py-3 rounded-xl bg-[#40b020] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#40b020]/20"
              >
                <span>Upgrade VIP Package</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Help / Rules Drawer */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in border ${
              isDark ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#40b020]" /> Team Referral Rules
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`space-y-2 text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              <p>
                <strong>1. Instant Commission:</strong> Whenever any member in your Level A, B, or C tier activates a Speed Pay subscription package, your commission is credited directly to your wallet balance instantly.
              </p>
              <p>
                <strong>2. Tier Breakdown:</strong>
                <br />• Level A (Direct): 10%
                <br />• Level B (2nd Gen): 2%
                <br />• Level C (3rd Gen): 1%
              </p>
              <p>
                <strong>3. Withdrawal:</strong> All referral commissions are fully withdrawable during official banking hours without any lock periods.
              </p>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs dark:bg-slate-800 dark:hover:bg-slate-700 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: See All Team Members Drawer */}
      {showAllMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-md max-h-[85vh] rounded-3xl p-5 shadow-2xl flex flex-col animate-scale-in border ${
              isDark ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? "border-slate-800" : "border-slate-200"}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-[#40b020]" /> All Team Members ({allMembers.length})
              </h3>
              <button
                onClick={() => setShowAllMembersModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 py-3 border-b border-slate-100 dark:border-slate-800">
              {(["ALL", "A", "B", "C"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevelFilter(lvl)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition ${
                    selectedLevelFilter === lvl
                      ? "bg-[#40b020] text-slate-950 font-bold shadow-xs"
                      : isDark
                      ? "bg-slate-800 text-slate-400 hover:text-white"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {lvl === "ALL" ? "All Levels" : `Level ${lvl}`}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-2 space-y-2">
              {filteredMembers.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  No members found in this level.
                </div>
              ) : (
                filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                      isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    <div>
                      <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{m.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Joined {new Date(m.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#40b020]/15 text-[#40b020]">
                        Level {m.level}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.accountStatus === "SUBSCRIBED"
                            ? "bg-[#40b020]/20 text-[#40b020]"
                            : isDark
                            ? "bg-slate-800 text-slate-400"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {m.accountStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
