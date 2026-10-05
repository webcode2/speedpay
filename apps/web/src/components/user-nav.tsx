"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  CheckSquare,
  User,
  Globe,
  Bell,
  Sun,
  Moon,
  MessageCircle,
  MessageSquareText,
  Headphones,
  X,
  Send,
  ExternalLink,
  Settings,
} from "lucide-react";
import { useUser } from "./user-context";

export const MOBILE_BOTTOM_TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/team", label: "Team", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileTopHeader() {
  const pathname = usePathname();
  const { wallet, theme, toggleTheme } = useUser();
  const [showLangModal, setShowLangModal] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");
  const isDark = theme === "dark";

  // Hide top header on pages that have their own dedicated header bar
  if (
    pathname === "/support" ||
    pathname === "/payment-methods" ||
    pathname === "/team" ||
    pathname === "/withdraw" ||
    pathname === "/invite"
  ) {
    return null;
  }

  return (
    <>
      <header
        className={`sticky top-0 z-30 px-4 pt-3.5 pb-2.5 backdrop-blur-xl w-full flex items-center justify-between transition-colors ${
          isDark
            ? "bg-[#0a0f1d]/95 text-white"
            : "bg-white/95 text-slate-900"
        }`}
      >
        {/* Left Side: Adapts to current screen */}
        {pathname === "/profile" ? (
          <div>
            <h1 className={`text-2xl font-black tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Profile
            </h1>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Manage your account and tasks
            </p>
          </div>
        ) : pathname === "/team" ? (
          <div>
            <h1 className={`text-xl font-black tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Team
            </h1>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Referrals & 3-tier commission
            </p>
          </div>
        ) : pathname === "/tasks" ? (
          <div>
            <h1 className={`text-xl font-black tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Tasks
            </h1>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Daily diagnostics & dividends
            </p>
          </div>
        ) : pathname === "/packages" ? (
          <div>
            <h1 className={`text-xl font-black tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Packages
            </h1>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Clean energy yield subscriptions
            </p>
          </div>
        ) : pathname === "/wallet" ? (
          <div>
            <h1 className={`text-xl font-black tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Wallet
            </h1>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Balance, deposits & withdrawals
            </p>
          </div>
        ) : pathname === "/notifications" ? (
          <div>
            <h1 className={`text-xl font-black tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-950"}`}>
              Notifications
            </h1>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              System updates & activity alerts
            </p>
          </div>
        ) : (
          /* Default Brand Left (Home / Dashboard) */
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden relative shadow-md shadow-[#40b020]/20 shrink-0 border border-slate-200/50 dark:border-slate-800">
              <Image
                src={isDark ? "/logo_TRANSPARENT.jpeg" : "/logo_whiteBG.jpeg"}
                alt="SPEED PAY Logo"
                fill
                className="object-cover"
                sizes="36px"
                priority
              />
            </div>
            <div>
              <div
                className={`text-sm font-black tracking-wide leading-tight flex items-center gap-1 ${
                  isDark ? "text-white" : "text-slate-950"
                }`}
              >
                SPEED<span className="text-[#40b020]">PAY</span>
              </div>
              <div
                className={`text-[10px] font-medium tracking-tight ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Solar Power. Clean Yield.
              </div>
            </div>
          </Link>
        )}

        {/* Right Actions: Per-screen features */}
        <div className="flex items-center gap-1.5">
          {/* On Home/Dashboard: Show Balance Pill & Language */}
          {(pathname === "/dashboard" || pathname === "/") && (
            <>
              <button
                type="button"
                onClick={() => setShowLangModal(true)}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950"
                }`}
                title="Select Language"
              >
                <Globe className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
              isDark
                ? "bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:border-slate-700"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-300"
            }`}
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Bell */}
          <Link
            href="/notifications"
            className={`w-8 h-8 rounded-full border flex items-center justify-center relative transition ${
              isDark
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950"
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#40b020] animate-pulse" />
          </Link>

          {/* On Profile: Settings Gear Icon */}
          {pathname === "/profile" && (
            <Link
              href="/profile/personal"
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-300"
              }`}
              title="Settings & Personal Information"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      {/* Language Selection Modal */}
      {showLangModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
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
                <Globe className="w-4 h-4 text-[#40b020]" /> Select Language
              </h3>
              <button
                onClick={() => setShowLangModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 pt-1">
              {[
                { name: "English", code: "en", flag: "🇬🇧" },
                { name: "Hausa", code: "ha", flag: "🇳🇬" },
                { name: "Yorùbá", code: "yo", flag: "🇳🇬" },
                { name: "Igbo", code: "ig", flag: "🇳🇬" },
                { name: "Français", code: "fr", flag: "🇫🇷" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLang(lang.name);
                    setShowLangModal(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    selectedLang === lang.name
                      ? "bg-[#40b020]/20 text-[#40b020] border border-[#40b020]/40"
                      : isDark
                      ? "text-slate-300 hover:bg-slate-800/80"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                  {selectedLang === lang.name && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { theme } = useUser();
  const isDark = theme === "dark";

  return (
    <nav
      className={`fixed bottom-0 max-w-[430px] w-full z-40 pb-safe backdrop-blur-2xl transition-colors ${
        isDark
          ? "bg-[#0a0f1d]/95 border-t border-slate-800/90"
          : "bg-white/95 border-t border-slate-200/90"
      }`}
    >
      <div className="grid grid-cols-4 py-2 px-2">
        {MOBILE_BOTTOM_TABS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
                isActive
                  ? "text-[#40b020] font-bold"
                  : isDark
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition ${
                  isActive ? "bg-[#40b020]/15" : ""
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? "text-[#40b020]"
                      : isDark
                      ? "text-slate-400"
                      : "text-slate-500"
                  }`}
                />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SimpleChatWidget() {
  const { theme } = useUser();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ sender: "agent" | "user"; text: string; time: string }>
  >([
    {
      sender: "agent",
      text: "Hello! Welcome to SpeedPay Support. How can we help you today with deposits, withdrawals, or tasks?",
      time: "Just now",
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userText = message;
    setMessage("");
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userText, time: "Just now" },
    ]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: "Thank you for reaching out! An official agent is reviewing your query. For instant response, you can also join our WhatsApp or Telegram channel below.",
          time: "Just now",
        },
      ]);
    }, 900);
  };

  return (
    <>
      {/* Floating Chat Button locked within the max-w-[430px] viewport */}
      <div className="fixed bottom-20 z-40 max-w-[430px] w-full pointer-events-none flex justify-end px-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="pointer-events-auto w-11 h-11 rounded-full bg-gradient-to-tr from-[#002060] via-[#10356c] to-[#40b020] text-white shadow-xl shadow-[#40b020]/25 flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-white/20 group relative"
          title="Live Chat Support"
        >
          {open ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <MessageSquareText className="w-5 h-5 text-white group-hover:rotate-6 transition-transform" />
          )}
          {/* Online Dot */}
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[#40b020] border-2 border-white dark:border-[#0a0f1d] animate-pulse" />
        </button>
      </div>

      {/* Live Chat Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-[360px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-scale-in ${
              isDark
                ? "bg-[#0f172a] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#002060] to-[#10356c] p-3.5 text-white flex items-center justify-between border-b border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#40b020]/20 border border-[#40b020]/50 flex items-center justify-center text-[#40b020]">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-tight">
                    SpeedPay Live Support
                  </h3>
                  <p className="text-[10px] text-[#40b020] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#40b020] animate-pulse" />{" "}
                    24/7 Desk Active
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Support Links */}
            <div
              className={`grid grid-cols-2 gap-2 p-3 border-b text-[11px] ${
                isDark
                  ? "bg-slate-900/90 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <a
                href="https://wa.me/2348000000000"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#40b020]/15 hover:bg-[#40b020]/25 text-[#40b020] font-semibold border border-[#40b020]/30 transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp VIP</span>
              </a>
              <a
                href="https://t.me/solar_support"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-500 dark:text-sky-300 font-semibold border border-sky-500/30 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>Telegram Desk</span>
              </a>
            </div>

            {/* Chat Messages */}
            <div
              className={`p-3.5 space-y-3 h-56 overflow-y-auto text-xs ${
                isDark ? "bg-[#0a0f1d]/90" : "bg-slate-50/50"
              }`}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    m.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-2.5 text-xs ${
                      m.sender === "user"
                        ? "bg-[#40b020] text-slate-950 font-medium rounded-tr-xs"
                        : isDark
                        ? "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-xs"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs"
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                    {m.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleSend}
              className={`p-2.5 border-t flex items-center gap-2 ${
                isDark
                  ? "bg-slate-900 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#40b020] border ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                }`}
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="w-8 h-8 rounded-xl bg-[#40b020] text-slate-950 flex items-center justify-center hover:opacity-90 transition disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Aliases for compatibility
export const ResponsiveTopHeader = MobileTopHeader;
export const FloatingSupportWidget = SimpleChatWidget;
export const DesktopSidebar = () => null;
