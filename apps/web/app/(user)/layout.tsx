"use client";

import { UserProvider, useUser } from "@/components/user-context";
import {
  MobileTopHeader,
  MobileBottomNav,
  SimpleChatWidget,
} from "@/components/user-nav";

function UserLayoutInner({ children }: { children: React.ReactNode }) {
  const { theme } = useUser();
  const isDark = theme === "dark";

  return (
    <div
      className={`min-h-screen flex justify-center items-start selection:bg-[#40b020] selection:text-white transition-colors ${
        isDark ? "bg-[#060913] text-slate-100" : "bg-[#f1f5f9] text-slate-900"
      }`}
    >
      {/* Mobile Container Frame */}
      <div
        className={`w-full max-w-[430px] min-h-screen shadow-2xl flex flex-col relative overflow-x-hidden transition-colors ${
          isDark
            ? "bg-[#0a0f1d] text-slate-100 border-x border-slate-800/80 shadow-black dark-theme"
            : "bg-[#ffffff] text-slate-900 border-x border-slate-200/90 shadow-slate-300/50 light-theme"
        }`}
      >
        {/* Top Header */}
        <MobileTopHeader />

        {/* Main Content Viewport */}
        <main className="flex-1 pb-24 px-3.5 pt-3 w-full">{children}</main>

        {/* Floating Chat Widget */}
        <SimpleChatWidget />

        {/* Bottom Tab Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <UserLayoutInner>{children}</UserLayoutInner>
    </UserProvider>
  );
}
