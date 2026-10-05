"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Users,
  Wallet,
  Coins,
  Copy,
  Check,
  MessageCircle,
  X,
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

export default function InvitePage() {
  const router = useRouter();
  const { user, wallet, theme } = useUser();
  const isDark = theme === "dark";

  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const referralCode = user?.referralCode || teamData?.referralCode || "SP8820";
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
      `Join my Speed Pay team and start earning daily solar task rewards! Register here with my invite code ${referralCode}: ${referralLink}`,
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const totalEarnings = Number(wallet?.totalCommission || wallet?.totalEarned || 0);
  const totalInvited = teamData?.overview?.totalMembers ?? teamData?.members?.length ?? 0;
  const friendDeposits = totalInvited * 12000 * 0.5;

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      {/* 1. Header Navigation Bar matching reference */}
      <div className="flex items-center justify-between px-1 pt-1 pb-1">
        <button
          type="button"
          onClick={() => router.back()}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition border ${
            isDark
              ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950"
          }`}
          title="Go back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <h1
          className={`text-base sm:text-lg font-black tracking-tight ${
            isDark ? "text-white" : "text-slate-950"
          }`}
        >
          Invite Friends
        </h1>

        <button
          type="button"
          onClick={() => setShowRulesModal(true)}
          className={`text-xs font-bold transition hover:underline cursor-pointer ${
            isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-950"
          }`}
        >
          Invite Rules
        </button>
      </div>

      {/* 2. Top Hero Card matching screenshot */}
      <div
        className={`rounded-3xl border relative overflow-hidden shadow-xs transition-all ${
          isDark
            ? "bg-slate-900/90 border-slate-800 text-white"
            : "bg-[#f3f4f6] border-slate-200/80 text-slate-900"
        }`}
      >
        <div className="p-5 sm:p-6 flex flex-row items-center justify-between gap-3 relative z-10">
          <div className="space-y-1.5 min-w-0">
            <h2 className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-slate-950 dark:text-white">
              Invite Friends <br />
              Earn Together
            </h2>
            <p className={`text-xs leading-relaxed max-w-[200px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Share solar plans, earn generous rewards.
            </p>
          </div>

          {/* Right 3D Gift Illustration */}
          <div className="w-[120px] sm:w-[145px] h-[95px] sm:h-[110px] relative shrink-0">
            <Image
              src="/images/invite_gift_hero.jpg"
              alt="Invite Friends Gift Box"
              fill
              className="object-contain object-right"
              sizes="145px"
              priority
            />
          </div>
        </div>
      </div>

      {/* 3. 3-Column Metrics Card */}
      <div
        className={`rounded-3xl border grid grid-cols-3 gap-2 px-3 py-4 text-center shadow-xs ${
          isDark
            ? "bg-slate-900/80 border-slate-800 text-white"
            : "bg-white border-slate-200/90 text-slate-900"
        }`}
      >
        {/* Total Earnings */}
        <div className="space-y-1">
          <div className="flex justify-center text-slate-400 dark:text-slate-500">
            <Wallet className="w-4 h-4" />
          </div>
          <span className={`text-[10px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Total Earnings
          </span>
          <span className="text-xs sm:text-sm font-bold block text-slate-950 dark:text-white">
            NGN {totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Invited Friends */}
        <div className={`space-y-1 border-x ${isDark ? "border-slate-800" : "border-slate-100"}`}>
          <div className="flex justify-center text-slate-400 dark:text-slate-500">
            <Users className="w-4 h-4" />
          </div>
          <span className={`text-[10px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Invited Friends
          </span>
          <span className="text-xs sm:text-sm font-bold block text-slate-950 dark:text-white">
            {totalInvited}
          </span>
        </div>

        {/* Friend Deposits */}
        <div className="space-y-1">
          <div className="flex justify-center text-slate-400 dark:text-slate-500">
            <Coins className="w-4 h-4" />
          </div>
          <span className={`text-[10px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Friend Deposits
          </span>
          <span className="text-xs sm:text-sm font-bold block text-slate-950 dark:text-white">
            NGN {friendDeposits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 4. "Invite your friends" Section Card */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xs ${
          isDark
            ? "bg-slate-900/80 border-slate-800 text-white"
            : "bg-white border-slate-200/90 text-slate-900"
        }`}
      >
        <div className="space-y-0.5">
          <h3 className="text-base font-bold text-slate-950 dark:text-white">
            Invite your friends
          </h3>
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Share your link or code and start earning.
          </p>
        </div>

        {/* Dashed Invite Code Box */}
        <div
          className={`p-4 rounded-2xl border-2 border-dashed flex items-center justify-between ${
            isDark
              ? "bg-slate-950/60 border-slate-800"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="space-y-0.5">
            <span className={`text-[10px] font-semibold block uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              My Invite Code
            </span>
            <div className="text-lg sm:text-xl font-mono font-black tracking-wider text-slate-950 dark:text-white">
              {referralCode}
            </div>
          </div>

          <button
            type="button"
            onClick={copyCode}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
              copiedCode
                ? "bg-[#40b020] text-slate-950"
                : isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-slate-200 hover:bg-slate-300 text-slate-800"
            }`}
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{copiedCode ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* Share Link Actions */}
        <div className="space-y-2 pt-1">
          <span className={`text-[11px] font-semibold block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Registration Invite Link
          </span>
          <div
            className={`p-3 rounded-2xl border text-xs font-mono truncate ${
              isDark ? "bg-slate-950/60 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            {referralLink}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={copyLink}
              className={`flex-1 py-3 px-4 rounded-full font-bold text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer ${
                copiedLink
                  ? "bg-[#40b020] text-slate-950"
                  : isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200"
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
            </button>

            <button
              type="button"
              onClick={shareWhatsapp}
              className="py-3 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. "Invite Rules" Modal / Bottom-Sheet matching screenshot */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className={`w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl border shadow-2xl space-y-4 animate-scale-up ${
              isDark ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Header with Title & Close ✕ */}
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                Invite Rules
              </h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition cursor-pointer ${
                  isDark ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-950"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              When friends complete tasks, you earn A / B / C tier commissions.
            </p>

            {/* 3-Tier Commission List */}
            <div className="space-y-2.5 pt-1">
              {/* Level A */}
              <div
                className={`px-4 py-3.5 rounded-2xl flex items-center justify-between transition ${
                  isDark
                    ? "bg-slate-900/90 border border-slate-800 text-white"
                    : "bg-slate-50 border border-slate-100 text-slate-900"
                }`}
              >
                <span className="text-xs font-bold">Level A</span>
                <span className="text-xs font-black text-[#40b020]">10%</span>
              </div>

              {/* Level B */}
              <div
                className={`px-4 py-3.5 rounded-2xl flex items-center justify-between transition ${
                  isDark
                    ? "bg-slate-900/90 border border-slate-800 text-white"
                    : "bg-slate-50 border border-slate-100 text-slate-900"
                }`}
              >
                <span className="text-xs font-bold">Level B</span>
                <span className="text-xs font-black text-[#40b020]">2%</span>
              </div>

              {/* Level C */}
              <div
                className={`px-4 py-3.5 rounded-2xl flex items-center justify-between transition ${
                  isDark
                    ? "bg-slate-900/90 border border-slate-800 text-white"
                    : "bg-slate-50 border border-slate-100 text-slate-900"
                }`}
              >
                <span className="text-xs font-bold">Level C</span>
                <span className="text-xs font-black text-[#40b020]">1%</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/team"
                onClick={() => setShowRulesModal(false)}
                className="w-full py-3.5 rounded-full bg-[#181e29] hover:bg-black text-white text-center block text-xs font-bold transition"
              >
                View Full Team Hierarchy
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
