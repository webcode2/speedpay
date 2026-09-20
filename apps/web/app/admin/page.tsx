"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "./_components/admin-nav";

type Dashboard = {
  totalUsers: number;
  kycPending: number;
  openPackages: number;
  activeInvestments: number;
  pendingWithdrawals: number;
  pendingPayoutAccounts: number;
  pendingDeposits: number;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setData(json.data.dashboard);
    })();
  }, []);

  const cards: { label: string; value: number; href: string }[] = data
    ? [
        { label: "Users", value: data.totalUsers, href: "/admin/users" },
        { label: "KYC pending", value: data.kycPending, href: "/admin/kyc" },
        { label: "Open packages", value: data.openPackages, href: "/admin/packages" },
        {
          label: "Active investments",
          value: data.activeInvestments,
          href: "/admin/investments",
        },
        {
          label: "Pending withdrawals",
          value: data.pendingWithdrawals,
          href: "/admin/withdrawals",
        },
        {
          label: "Pending payouts",
          value: data.pendingPayoutAccounts,
          href: "/admin/payouts",
        },
        {
          label: "Pending deposits",
          value: data.pendingDeposits,
          href: "/admin/deposits",
        },
      ]
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold">Admin dashboard</h1>
        <AdminNav />
      </div>
      {error ? <p className="text-red-400">{error}</p> : null}
      {!data && !error ? <p className="text-slate-400">Loading…</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href + c.label}
            href={c.href}
            className="rounded border border-slate-800 bg-slate-950 px-4 py-5 hover:border-emerald-700"
          >
            <div className="text-sm text-slate-400">{c.label}</div>
            <div className="text-3xl font-semibold">{c.value}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
