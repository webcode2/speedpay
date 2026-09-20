"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type AdminMe = {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
  permissions: string[];
};

const AdminSessionContext = createContext<AdminMe | null>(null);

export function useAdminSession(): AdminMe {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession requires AdminShell");
  }
  return ctx;
}

export function useAdminPermissions(): string[] {
  const ctx = useContext(AdminSessionContext);
  return ctx?.permissions ?? [];
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [ready, setReady] = useState(isLogin);

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/auth/me");
        const json = await res.json();
        if (!json.success) {
          router.replace("/admin/login");
          return;
        }
        if (!cancelled) {
          setAdmin(json.data.admin);
          setReady(true);
        }
      } catch {
        router.replace("/admin/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLogin, router, pathname]);

  if (isLogin) return <>{children}</>;
  if (!ready || !admin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <p className="text-slate-400">Checking staff session…</p>
      </main>
    );
  }

  return (
    <AdminSessionContext.Provider value={admin}>
      {children}
    </AdminSessionContext.Provider>
  );
}
