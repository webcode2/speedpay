"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export type PublicUser = {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  referralCode: string | null;
  createdAt?: string;
};

export type WalletData = {
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalCommission: number;
  totalEarned?: number;
};

export type ActiveSubscription = {
  id: string;
  planId: string;
  principal: number;
  status: string;
  startAt: string;
  planName?: string;
  dailyReward?: number;
  dailyTasks?: number;
};

export type TaskSummary = {
  quota: number;
  completed: number;
  remaining: number;
  earningsToday: number;
  rewardPerTask: number;
};

type UserContextType = {
  user: PublicUser | null;
  wallet: WalletData | null;
  activePlan: ActiveSubscription | null;
  taskSummary: TaskSummary | null;
  loading: boolean;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activePlan, setActivePlan] = useState<ActiveSubscription | null>(null);
  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sp_theme");
      if (saved === "dark" || saved === "light") {
        setThemeState(saved);
      } else {
        setThemeState("dark");
      }
    } catch {
      // ignore
    }
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t);
    try {
      localStorage.setItem("sp_theme", t);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("sp_theme", next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      // 1. Fetch Me
      const meRes = await fetch("/api/auth/me");
      const meJson = await meRes.json();
      if (!meJson.success || !meJson.data?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(meJson.data.user);

      // 2. Fetch Wallet
      const [walletRes, invRes, tasksRes] = await Promise.all([
        fetch("/api/wallet").then((r) => r.json()).catch(() => null),
        fetch("/api/investments").then((r) => r.json()).catch(() => null),
        fetch("/api/tasks/today").then((r) => r.json()).catch(() => null),
      ]);

      if (walletRes?.success && walletRes.data?.wallet) {
        setWallet(walletRes.data.wallet);
      }

      if (invRes?.success && Array.isArray(invRes.data?.items)) {
        const active = invRes.data.items.find(
          (inv: ActiveSubscription) => inv.status === "ACTIVE",
        );
        setActivePlan(active ?? null);
      }

      if (tasksRes?.success && tasksRes.data?.tasks) {
        const t = tasksRes.data.tasks;
        const completed = t.completedToday ?? t.tasksCompleted ?? 0;
        const remaining = t.remaining ?? t.tasksRemaining ?? 0;
        const quota = t.dailyLimit ?? (completed + remaining);
        const earningsToday = t.earnedToday ?? t.earningsToday ?? 0;
        const rewardPerTask = t.rewardPerTask ?? 0;
        setTaskSummary({
          quota,
          completed,
          remaining,
          earningsToday,
          rewardPerTask,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setWallet(null);
      setActivePlan(null);
      setTaskSummary(null);
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        wallet,
        activePlan,
        taskSummary,
        loading,
        theme,
        setTheme,
        toggleTheme,
        refreshUserData,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
