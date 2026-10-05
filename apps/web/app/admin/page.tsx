"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { AdminCard, AdminPageHeader, StatusPill } from "./_components/ui";

type Dashboard = {
  totalUsers: number;
  kycPending: number;
  pendingPayoutAccounts: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  activeInvestments: number;
  openPlans: number;
  money: {
    walletLiability: number;
    currency: string;
  };
  adoption: {
    planName: string;
    subscribers: number;
    principal: number;
  }[];
  referrals: {
    referredAccounts: number;
    referrers: number;
    subscribedViaReferral: number;
    recent: {
      referredUserId: string;
      referredEmail: string;
      accountStatus: string;
      referredAt: string;
      referrerUserId: string;
      referrerEmail: string;
    }[];
  };
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/dashboard");
        const json = await res.json();
        if (!json.success) {
          setError(json.error?.message ?? "Failed to load dashboard data");
          return;
        }
        setData(json.data.dashboard);
      } catch {
        setError("Network error loading dashboard");
      }
    })();
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Admin overview"
        subtitle="Platform governance, verification & accounts"
      />

      {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
      {!data && !error ? (
        <p className="text-[var(--sp-muted)]">Loading…</p>
      ) : null}

      {data ? (
        <>
          <AdminCard className="!p-0 overflow-hidden shadow-sm">
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--sp-border)] md:grid-cols-4 md:divide-y-0">
              {[
                {
                  title: "Active subscriptions",
                  value: data.activeInvestments ?? 0,
                  href: "/admin/investments",
                  note: "Investors currently earning",
                },
                {
                  title: "Open plans",
                  value: data.openPlans ?? 0,
                  href: "/admin/plans",
                  note: "Plans available to subscribe",
                },
                {
                  title: "KYC pending",
                  value: data.kycPending ?? 0,
                  href: "/admin/kyc",
                  note: "Awaiting compliance review",
                },
                {
                  title: "Registered users",
                  value: data.totalUsers ?? 0,
                  href: "/admin/users",
                  note: "Total platform accounts",
                },
              ].map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="px-5 py-4 transition hover:bg-[var(--sp-surface)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sp-muted)]">
                    {card.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[var(--sp-navy)]">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--sp-muted)]">{card.note}</p>
                </Link>
              ))}
            </div>

            <div className="border-t border-[var(--sp-border)] bg-[var(--sp-surface)]/50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sp-muted)]">
                  Total wallet liability
                </p>
                <p className="mt-0.5 text-2xl font-bold text-[var(--sp-navy)]">
                  {formatAmount(
                    data.money?.walletLiability ?? 0,
                    data.money?.currency ?? "NGN",
                  )}
                </p>
              </div>
              <Link
                href="/admin/users"
                className="text-sm font-semibold text-[var(--sp-lime-deep)] hover:underline"
              >
                View all users →
              </Link>
            </div>
          </AdminCard>

          <AdminCard className="!p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sp-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-[var(--sp-navy)]">
                  Referrals
                </h2>
                <p className="text-xs text-[var(--sp-muted)]">
                  Who invited whom, and whether the referred account subscribed
                </p>
              </div>
              <Link
                href="/admin/referrals"
                className="text-sm font-semibold text-[var(--sp-lime-deep)] hover:underline"
              >
                View all referrals →
              </Link>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--sp-border)]">
              {[
                {
                  title: "Referrers",
                  value: data.referrals?.referrers ?? 0,
                  note: "Accounts that invited someone",
                },
                {
                  title: "Referred accounts",
                  value: data.referrals?.referredAccounts ?? 0,
                  note: "Joined with an invite code",
                },
                {
                  title: "Subscribed via invite",
                  value: data.referrals?.subscribedViaReferral ?? 0,
                  note: "Referred and now on a plan",
                },
              ].map((card) => (
                <div key={card.title} className="px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sp-muted)]">
                    {card.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--sp-navy)]">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--sp-muted)]">{card.note}</p>
                </div>
              ))}
            </div>
            {(data.referrals?.recent ?? []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[var(--sp-muted)]">
                No referred accounts yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-y border-[var(--sp-border)] bg-[var(--sp-surface)] text-xs uppercase tracking-wide text-[var(--sp-muted)]">
                    <tr>
                      {["Referrer", "Referred account", "Status"].map((c) => (
                        <th key={c} className="px-4 py-3 font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--sp-border)]">
                    {(data.referrals?.recent ?? []).map((row) => (
                      <tr
                        key={row.referredUserId}
                        className="hover:bg-[var(--sp-surface)]/70"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/users/${row.referrerUserId}`}
                            className="font-medium text-[var(--sp-navy)] hover:underline"
                          >
                            {row.referrerEmail}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/users/${row.referredUserId}`}
                            className="text-[var(--sp-navy)] hover:underline"
                          >
                            {row.referredEmail}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={row.accountStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          <div className="grid gap-6 md:grid-cols-2">
            <AdminCard className="p-6">
              <h2 className="text-base font-bold text-[var(--sp-navy)]">
                Who subscribed
              </h2>
              <p className="mt-1 text-xs text-[var(--sp-muted)]">
                People on each plan and principal in Naira
              </p>
              <div className="mt-4 space-y-3">
                {(data.adoption ?? []).filter((row) => row.subscribers > 0)
                  .length === 0 ? (
                  <p className="text-sm text-[var(--sp-muted)]">
                    No subscriptions yet.
                  </p>
                ) : (
                  (data.adoption ?? [])
                    .filter((row) => row.subscribers > 0)
                    .map((row) => (
                    <Link
                      key={row.planName}
                      href="/admin/investments"
                      className="flex items-center justify-between rounded-xl border border-[var(--sp-border)] p-3.5 transition hover:bg-[var(--sp-surface)]"
                    >
                      <div>
                        <p className="font-semibold text-sm text-[var(--sp-navy)]">
                          {row.planName}
                        </p>
                        <p className="text-xs text-[var(--sp-muted)]">
                          ₦{formatAmount(row.principal)} subscribed
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--sp-lime-mint)] px-2.5 py-1 text-xs font-bold text-[var(--sp-lime-deep)]">
                        {row.subscribers}{" "}
                        {row.subscribers === 1 ? "person" : "people"}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </AdminCard>

            <AdminCard className="p-6">
              <h2 className="text-base font-bold text-[var(--sp-navy)]">
                Action queues
              </h2>
              <p className="mt-1 text-xs text-[var(--sp-muted)]">
                Items requiring staff verification and approval
              </p>
              <div className="mt-4 space-y-3">
                <Link
                  href="/admin/deposits"
                  className="flex items-center justify-between rounded-xl border border-[var(--sp-border)] p-3.5 transition hover:bg-[var(--sp-surface)]"
                >
                  <div>
                    <p className="font-semibold text-sm text-[var(--sp-navy)]">
                      Deposit & transfer verifications
                    </p>
                    <p className="text-xs text-[var(--sp-muted)]">
                      Manual bank transfer IDs awaiting confirmation
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {data.pendingDeposits ?? 0} pending
                  </span>
                </Link>

                <Link
                  href="/admin/withdrawals"
                  className="flex items-center justify-between rounded-xl border border-[var(--sp-border)] p-3.5 transition hover:bg-[var(--sp-surface)]"
                >
                  <div>
                    <p className="font-semibold text-sm text-[var(--sp-navy)]">
                      Withdrawal requests
                    </p>
                    <p className="text-xs text-[var(--sp-muted)]">
                      Pending investor withdrawals awaiting approval
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {data.pendingWithdrawals ?? 0} pending
                  </span>
                </Link>

                <Link
                  href="/admin/kyc"
                  className="flex items-center justify-between rounded-xl border border-[var(--sp-border)] p-3.5 transition hover:bg-[var(--sp-surface)]"
                >
                  <div>
                    <p className="font-semibold text-sm text-[var(--sp-navy)]">
                      KYC verifications
                    </p>
                    <p className="text-xs text-[var(--sp-muted)]">
                      Identity documents & compliance checks
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {data.kycPending} pending
                  </span>
                </Link>

                <Link
                  href="/admin/payouts"
                  className="flex items-center justify-between rounded-xl border border-[var(--sp-border)] p-3.5 transition hover:bg-[var(--sp-surface)]"
                >
                  <div>
                    <p className="font-semibold text-sm text-[var(--sp-navy)]">
                      Payout accounts
                    </p>
                    <p className="text-xs text-[var(--sp-muted)]">
                      Investor bank accounts & mobile money
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {data.pendingPayoutAccounts} pending
                  </span>
                </Link>
              </div>
            </AdminCard>

            <AdminCard className="p-6">
              <h2 className="text-base font-bold text-[var(--sp-navy)]">
                Administration & governance
              </h2>
              <p className="mt-1 text-xs text-[var(--sp-muted)]">
                Security, access control and audit trail
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Staff accounts",
                    desc: "Admin personnel",
                    href: "/admin/staff",
                  },
                  {
                    label: "Roles & permissions",
                    desc: "Access control",
                    href: "/admin/roles",
                  },
                  {
                    label: "Audit logs",
                    desc: "System activity",
                    href: "/admin/audit",
                  },
                  {
                    label: "System settings",
                    desc: "Configuration",
                    href: "/admin/settings",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl border border-[var(--sp-border)] p-3 transition hover:bg-[var(--sp-surface)]"
                  >
                    <p className="font-semibold text-sm text-[var(--sp-navy)]">
                      {item.label}
                    </p>
                    <p className="text-xs text-[var(--sp-muted)]">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </AdminCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
