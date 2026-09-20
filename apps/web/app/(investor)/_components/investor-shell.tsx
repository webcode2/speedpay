"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type InvestorMe = {
  id: string;
  email: string;
  status: string;
  phone?: string | null;
};

const InvestorSessionContext = createContext<InvestorMe | null>(null);

export function useInvestorSession(): InvestorMe {
  const ctx = useContext(InvestorSessionContext);
  if (!ctx) {
    throw new Error("useInvestorSession requires InvestorShell");
  }
  return ctx;
}

export function InvestorShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<InvestorMe | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (!json.success) {
          router.replace("/login");
          return;
        }
        if (!cancelled) {
          setUser(json.data.user);
          setReady(true);
        }
      } catch {
        router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready || !user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <p className="text-slate-400">Checking session…</p>
      </main>
    );
  }

  return (
    <InvestorSessionContext.Provider value={user}>
      {children}
    </InvestorSessionContext.Provider>
  );
}
