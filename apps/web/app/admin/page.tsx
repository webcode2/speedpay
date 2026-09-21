"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatAmount } from "@/lib/money";
import {
  AdminCard,
  AdminPageHeader,
  StatusPill,
} from "./_components/ui";

type Dashboard = {
  totalUsers: number;
  kycPending: number;
  openPackages: number;
  activeInvestments: number;
  pendingWithdrawals: number;
  pendingPayoutAccounts: number;
  pendingDeposits: number;
  money: {
    activePrincipal: number;
    expectedMaturityValue: number;
    maturedPrincipal: number;
    returnsCredited: number;
    walletLiability: number;
    pendingDepositAmount: number;
    pendingWithdrawalAmount: number;
    currency: string;
  };
};

type InvestmentRow = {
  id: string;
  status: string;
  principal: number;
  userEmail: string;
  packageName: string;
  createdAt: string;
};

type DepositRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  userEmail: string;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [dashRes, invRes, depRes] = await Promise.all([
        fetch("/api/admin/dashboard"),
        fetch("/api/admin/investments?limit=40"),
        fetch("/api/admin/deposits?limit=8"),
      ]);
      const dashJson = await dashRes.json();
      const invJson = await invRes.json();
      const depJson = await depRes.json();
      if (!dashJson.success) {
        setError(dashJson.error?.message ?? "Failed to load");
        return;
      }
      setData(dashJson.data.dashboard);
      if (invJson.success) setInvestments(invJson.data.items ?? []);
      if (depJson.success) setDeposits(depJson.data.items ?? []);
    })();
  }, []);

  const packageCards = useMemo(() => {
    const map = new Map<
      string,
      { packageName: string; subscribers: InvestmentRow[]; principal: number }
    >();
    for (const row of investments) {
      const key = row.packageName;
      const cur = map.get(key) ?? {
        packageName: key,
        subscribers: [],
        principal: 0,
      };
      cur.subscribers.push(row);
      cur.principal += Number(row.principal) || 0;
      map.set(key, cur);
    }
    return [...map.values()].sort(
      (a, b) => b.subscribers.length - a.subscribers.length,
    );
  }, [investments]);

  const queueTotal = data
    ? data.kycPending +
      data.pendingDeposits +
      data.pendingWithdrawals +
      data.pendingPayoutAccounts
    : 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Portfolio overview"
        subtitle="SPEED PAY operations"
        actions={
          <div className="flex flex-wrap gap-2">
            {["Overview", "Queues", "Investments", "Reports"].map((tab, i) => (
              <span
                key={tab}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  i === 0
                    ? "bg-[var(--sp-navy)] text-white"
                    : "bg-white text-[var(--sp-muted)] ring-1 ring-[var(--sp-border)]"
                }`}
              >
                {tab}
              </span>
            ))}
          </div>
        }
      />

      {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
      {!data && !error ? (
        <p className="text-[var(--sp-muted)]">Loading…</p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Open queues",
                value: queueTotal,
                href: "/admin/kyc",
                note: "KYC · deposits · withdrawals",
              },
              {
                title: "Active investments",
                value: data.activeInvestments,
                href: "/admin/investments",
                note: "Live investor positions",
              },
              {
                title: "Open packages",
                value: data.openPackages,
                href: "/admin/packages",
                note: "Marketplace inventory",
              },
              {
                title: "Registered users",
                value: data.totalUsers,
                href: "/admin/users",
                note: "Investor accounts",
              },
            ].map((card) => (
              <Link key={card.title} href={card.href}>
                <AdminCard className="h-full transition hover:border-[var(--sp-lime)]">
                  <p className="text-sm text-[var(--sp-muted)]">{card.title}</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--sp-navy)]">
                    {card.value}
                  </p>
                  <p className="mt-2 text-xs text-[var(--sp-muted)]">{card.note}</p>
                </AdminCard>
              </Link>
            ))}
          </div>

          <AdminCard className="overflow-hidden !p-0">
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--sp-border)] md:grid-cols-3 xl:grid-cols-7 xl:divide-y-0">
              {[
                {
                  title: "Active principal",
                  value: data.money?.activePrincipal ?? 0,
                  href: "/admin/investments",
                },
                {
                  title: "Expected maturity",
                  value: data.money?.expectedMaturityValue ?? 0,
                  href: "/admin/investments",
                },
                {
                  title: "Matured principal",
                  value: data.money?.maturedPrincipal ?? 0,
                  href: "/admin/maturities",
                },
                {
                  title: "Returns credited",
                  value: data.money?.returnsCredited ?? 0,
                  href: "/admin/returns",
                },
                {
                  title: "Wallet liability",
                  value: data.money?.walletLiability ?? 0,
                  href: "/admin/users",
                },
                {
                  title: "Pending deposits",
                  value: data.money?.pendingDepositAmount ?? 0,
                  href: "/admin/deposits",
                },
                {
                  title: "Pending withdrawals",
                  value: data.money?.pendingWithdrawalAmount ?? 0,
                  href: "/admin/withdrawals",
                },
              ].map((tile) => (
                <Link
                  key={tile.title}
                  href={tile.href}
                  className="px-3 py-3 transition hover:bg-[var(--sp-surface)]"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--sp-muted)]">
                    {tile.title}
                  </p>
                  <p className="mt-1 text-base font-bold text-[var(--sp-navy)] sm:text-lg">
                    {formatAmount(tile.value, data.money?.currency ?? "NGN")}
                  </p>
                </Link>
              ))}
            </div>
          </AdminCard>

          <div className="grid gap-4 xl:grid-cols-3">
            <AdminCard className="xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--sp-navy)]">
                    Packages & subscribers
                  </h2>
                  <p className="text-sm text-[var(--sp-muted)]">
                    Investment products with investor participation
                  </p>
                </div>
                <Link
                  href="/admin/investments"
                  className="text-sm font-medium text-[var(--sp-lime-deep)]"
                >
                  View all
                </Link>
              </div>
              {packageCards.length === 0 ? (
                <p className="text-sm text-[var(--sp-muted)]">
                  No investments yet.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {packageCards.slice(0, 4).map((pkg) => (
                    <div
                      key={pkg.packageName}
                      className="rounded-2xl border border-[var(--sp-border)] bg-[var(--sp-surface)] p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[var(--sp-navy)]">
                            {pkg.packageName}
                          </p>
                          <p className="text-xs text-[var(--sp-muted)]">
                            {pkg.subscribers.length} subscriber
                            {pkg.subscribers.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--sp-navy)] ring-1 ring-[var(--sp-border)]">
                          {formatAmount(pkg.principal)}
                        </span>
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {pkg.subscribers.slice(0, 3).map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <Link
                              href={`/admin/investments/${s.id}`}
                              className="truncate text-[var(--sp-navy)] hover:text-[var(--sp-lime-deep)]"
                            >
                              {s.userEmail}
                            </Link>
                            <StatusPill status={s.status} />
                          </li>
                        ))}
                        {pkg.subscribers.length > 3 ? (
                          <li className="text-xs text-[var(--sp-muted)]">
                            +{pkg.subscribers.length - 3} more
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>

            <AdminCard className="bg-[var(--sp-navy)] text-white">
              <p className="text-sm text-white/70">Needs attention</p>
              <p className="mt-2 text-3xl font-bold">{queueTotal}</p>
              <p className="mt-1 text-sm text-white/70">open review items</p>
              <div className="mt-6 space-y-3 text-sm">
                {[
                  { label: "KYC", value: data.kycPending, href: "/admin/kyc" },
                  {
                    label: "Deposits",
                    value: data.pendingDeposits,
                    href: "/admin/deposits",
                  },
                  {
                    label: "Withdrawals",
                    value: data.pendingWithdrawals,
                    href: "/admin/withdrawals",
                  },
                  {
                    label: "Payouts",
                    value: data.pendingPayoutAccounts,
                    href: "/admin/payouts",
                  },
                ].map((row) => (
                  <Link
                    key={row.href}
                    href={row.href}
                    className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 hover:bg-white/15"
                  >
                    <span>{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </Link>
                ))}
              </div>
            </AdminCard>
          </div>

          <AdminCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[var(--sp-border)] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--sp-navy)]">
                  Recent deposits
                </h2>
                <p className="text-sm text-[var(--sp-muted)]">
                  Latest funding activity
                </p>
              </div>
              <Link
                href="/admin/deposits"
                className="text-sm font-medium text-[var(--sp-lime-deep)]"
              >
                Open table
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--sp-surface)] text-xs uppercase tracking-wide text-[var(--sp-muted)]">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sp-border)]">
                  {deposits.map((d) => (
                    <tr key={d.id} className="hover:bg-[var(--sp-surface)]/70">
                      <td className="px-5 py-3 font-medium text-[var(--sp-navy)]">
                        {d.userEmail}
                      </td>
                      <td className="px-5 py-3">
                        {formatAmount(d.amount, d.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={d.status} />
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/deposits/${d.id}`}
                          className="font-medium text-[var(--sp-lime-deep)]"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {deposits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-[var(--sp-muted)]"
                      >
                        No deposits yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </>
      ) : null}
    </div>
  );
}
