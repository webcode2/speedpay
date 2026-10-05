"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ShieldCheck,
  MessageSquare,
  Headphones,
  Megaphone,
  Users,
  Bell,
  HelpCircle,
  ChevronRight,
  X,
  PhoneCall,
  ExternalLink,
} from "lucide-react";
import { useUser } from "@/components/user-context";

export default function SupportPage() {
  const router = useRouter();
  const { theme } = useUser();
  const isDark = theme === "dark";
  const [showFaqModal, setShowFaqModal] = useState(false);

  // Trigger chat widget if live chat is clicked
  const handleOpenLiveChat = () => {
    // Look for chat widget toggle button
    const chatBtn = document.querySelector<HTMLButtonElement>('[aria-label="Open Live Chat"], button[title*="Chat"]');
    if (chatBtn) {
      chatBtn.click();
    } else {
      alert("Connecting you to a Live Support Agent...");
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <div className="-mx-4 -mt-4 bg-[#2563eb] text-white px-4 py-3.5 shadow-md flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 rounded-full hover:bg-white/20 transition active:scale-95"
          aria-label="Go Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-bold flex-1 text-center pr-7">
          Customer Service & Support
        </h1>
      </div>

      {/* Security Warning Notice */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
          isDark
            ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}
      >
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-[#40b020] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-xs leading-relaxed font-medium">
          To protect your funds, please only use the officially verified links below.
        </p>
      </div>

      {/* Live Chat Card */}
      <div
        className={`p-4 rounded-3xl border transition shadow-xs flex items-center justify-between gap-3 ${
          isDark
            ? "bg-slate-900/90 border-slate-800 text-white"
            : "bg-white border-slate-200/90 text-slate-900 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">Live Chat</h2>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-2`}>
              Instant in-app chat — agents can join anytime
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenLiveChat}
          className="shrink-0 px-4 py-2 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-0.5"
        >
          <span>Start Chat</span>
          <span className="text-sm leading-none ml-0.5">›</span>
        </button>
      </div>

      {/* Official Telegram Channels */}
      <div className="space-y-2.5 pt-1">
        <h3 className="text-xs font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200 px-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Official Telegram Channels
        </h3>

        <div
          className={`rounded-3xl border divide-y overflow-hidden shadow-xs ${
            isDark
              ? "bg-slate-900/90 border-slate-800 divide-slate-800 text-white"
              : "bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-sm"
          }`}
        >
          {/* Telegram Support */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">Telegram Technical Support</h4>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                  One-on-one help from our professional support team
                </p>
              </div>
            </div>
            <a
              href="https://t.me/solar_support"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 px-4 py-2 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-0.5"
            >
              <span>Contact</span>
              <span className="text-sm leading-none ml-0.5">›</span>
            </a>
          </div>

          {/* Telegram Announcements */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">Official Telegram Announcements</h4>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                  Latest news, events, and official updates
                </p>
              </div>
            </div>
            <a
              href="https://t.me/solar_announcements"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 px-4 py-2 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-0.5"
            >
              <span>Join Now</span>
              <span className="text-sm leading-none ml-0.5">›</span>
            </a>
          </div>

          {/* Telegram Community */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">Official Telegram Community</h4>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                  Share experience with members worldwide
                </p>
              </div>
            </div>
            <a
              href="https://t.me/solar_community"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 px-4 py-2 rounded-full bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-0.5"
            >
              <span>Join Now</span>
              <span className="text-sm leading-none ml-0.5">›</span>
            </a>
          </div>
        </div>
      </div>

      {/* Official WhatsApp Channels */}
      <div className="space-y-2.5 pt-1">
        <h3 className="text-xs font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200 px-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Official WhatsApp Channels
        </h3>

        <div
          className={`rounded-3xl border divide-y overflow-hidden shadow-xs ${
            isDark
              ? "bg-slate-900/90 border-slate-800 divide-slate-800 text-white"
              : "bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-sm"
          }`}
        >
          {/* WhatsApp 24/7 Support */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">WhatsApp 24/7 Support</h4>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                  Always online to answer your questions
                </p>
              </div>
            </div>
            <span className="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold">
              Coming Soon
            </span>
          </div>

          {/* WhatsApp Channel */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">Official WhatsApp Channel</h4>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                  Follow official updates anytime, anywhere
                </p>
              </div>
            </div>
            <a
              href="https://whatsapp.com/channel/solar-official"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 px-4 py-2 rounded-full bg-[#16a34a] hover:bg-emerald-600 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-0.5"
            >
              <span>Join Now</span>
              <span className="text-sm leading-none ml-0.5">›</span>
            </a>
          </div>

          {/* WhatsApp Group */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">Official WhatsApp Group</h4>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                  Join the WhatsApp investor community
                </p>
              </div>
            </div>
            <a
              href="https://chat.whatsapp.com/solar-investor-group"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 px-4 py-2 rounded-full bg-[#16a34a] hover:bg-emerald-600 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-0.5"
            >
              <span>Join Now</span>
              <span className="text-sm leading-none ml-0.5">›</span>
            </a>
          </div>
        </div>
      </div>

      {/* FAQ Card */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowFaqModal(true)}
          className={`w-full p-4 rounded-3xl border transition shadow-xs flex items-center justify-between text-left group active:scale-98 ${
            isDark
              ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-white"
              : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-900 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold shadow-sm shadow-blue-500/30">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold truncate">FAQ</h4>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                Answers about recharge, withdrawal, VIP rewards, and platform rules
              </p>
            </div>
          </div>

          <ChevronRight
            className={`w-5 h-5 shrink-0 ${
              isDark ? "text-slate-500 group-hover:text-white" : "text-slate-400 group-hover:text-slate-700"
            }`}
          />
        </button>
      </div>

      {/* FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in max-h-[85vh] overflow-y-auto border ${
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
                <HelpCircle className="w-4 h-4 text-blue-500" /> Frequently Asked Questions
              </h3>
              <button
                onClick={() => setShowFaqModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                className={`p-3 rounded-2xl border space-y-1 ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <h4 className="font-bold">How do daily tasks work?</h4>
                <p className="text-slate-400 text-[11px]">
                  Depending on your active solar package, you receive daily diagnostics. Each completed task credits your wallet balance immediately.
                </p>
              </div>

              <div
                className={`p-3 rounded-2xl border space-y-1 ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <h4 className="font-bold">When can I withdraw my earnings?</h4>
                <p className="text-slate-400 text-[11px]">
                  Withdrawals are open 24/7. Minimum withdrawal is ₦100. Payouts are credited directly to your bank account after approval.
                </p>
              </div>

              <div
                className={`p-3 rounded-2xl border space-y-1 ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <h4 className="font-bold">How does the 3-tier VIP referral reward work?</h4>
                <p className="text-slate-400 text-[11px]">
                  You earn 10% on direct Level A referrals, 2% on Level B, and 1% on Level C whenever they subscribe to a solar energy package.
                </p>
              </div>

              <div
                className={`p-3 rounded-2xl border space-y-1 ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <h4 className="font-bold">Is payment verification automatic?</h4>
                <p className="text-slate-400 text-[11px]">
                  Manual bank transfers with receipts are reviewed rapidly by our financial settlement team. Wallet transfers are activated instantly.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFaqModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
