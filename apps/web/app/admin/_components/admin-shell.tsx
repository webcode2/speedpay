"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import {
  AdminSessionProvider,
  type AdminMe,
} from "./admin-session";

export { useAdminSession, useAdminPermissions } from "./admin-session";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [ready, setReady] = useState(isLogin);
  const [badges, setBadges] = useState<Record<string, number>>({});

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

  useEffect(() => {
    if (isLogin || !admin) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/dashboard");
        const json = await res.json();
        if (!json.success || cancelled) return;
        const d = json.data.dashboard;
        setBadges({
          "/admin/kyc": d.kycPending ?? 0,
          "/admin/deposits": d.pendingDeposits ?? 0,
          "/admin/withdrawals": d.pendingWithdrawals ?? 0,
          "/admin/payouts": d.pendingPayoutAccounts ?? 0,
        });
      } catch {
        /* ignore badge failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLogin, admin]);

  if (isLogin) return <>{children}</>;
  if (!ready || !admin) {
    return (
      <main className="admin-app flex min-h-screen items-center justify-center px-6">
        <p className="text-[var(--sp-muted)]">Checking staff session…</p>
      </main>
    );
  }

  return (
    <AdminSessionProvider admin={admin}>
      <div className="admin-app flex min-h-screen">
        <AdminSidebar badges={badges} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-[var(--sp-border)] bg-white px-6 py-4">
            <div className="min-w-0 flex-1">
              <input
                className="w-full max-w-xl rounded-xl border border-[var(--sp-border)] bg-[var(--sp-surface)] px-4 py-2.5 text-sm text-[var(--sp-text)] outline-none ring-[var(--sp-lime)] placeholder:text-[var(--sp-muted)] focus:ring-2"
                placeholder="Search users, KYC, packages…"
                readOnly
              />
            </div>
            <a
              href="/admin/packages/new"
              className="shrink-0 rounded-xl bg-[var(--sp-lime)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--sp-lime-deep)]"
            >
              + New package
            </a>
          </header>
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </div>
      </div>
    </AdminSessionProvider>
  );
}
