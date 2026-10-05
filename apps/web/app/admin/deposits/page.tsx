"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { formatAmount } from "@/lib/money";
import {
  AdminCard,
  AdminPageHeader,
  StatusPill,
} from "../_components/ui";

type DepositItem = {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerRef: string | null;
  senderTransactionId: string | null;
  senderName: string | null;
  receiptUrl: string | null;
  paymentAccountId: string | null;
  paymentBankName: string | null;
  paymentAccountName: string | null;
  paymentAccountNumber: string | null;
  createdAt: string;
};

export default function AdminDepositsPage() {
  const [items, setItems] = useState<DepositItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== "ALL") q.set("status", statusFilter);
      if (search.trim()) q.set("search", search.trim());

      const res = await fetch(`/api/admin/deposits?${q.toString()}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load deposits.");
        return;
      }
      setItems(json.data.items ?? []);
    } catch {
      setError("Network error loading deposits.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void loadDeposits();
  }, [loadDeposits]);

  const pendingCount = items.filter((d) => d.status === "PENDING").length;

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Deposit & Payment Verification"
        subtitle="Review manual bank deposits, transfer transaction IDs, and credit user wallets"
      />

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {["PENDING", "SUCCESS", "FAILED", "ALL"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                statusFilter === s
                  ? "bg-[var(--sp-lime-deep)] text-white shadow-sm"
                  : "border border-[var(--sp-border)] bg-[var(--sp-card)] text-[var(--sp-muted)] hover:bg-[var(--sp-surface)]"
              }`}
            >
              {s === "PENDING"
                ? `Pending Review (${pendingCount})`
                : s === "SUCCESS"
                ? "Approved / Success"
                : s === "FAILED"
                ? "Rejected / Failed"
                : "All Deposits"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search email, TX ID, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-[var(--sp-border)] bg-[var(--sp-surface)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--sp-lime-deep)]"
          />
        </div>
      </div>

      <AdminCard className="!p-0 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--sp-muted)]">
            Loading deposits…
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--sp-muted)]">
            No deposits found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--sp-border)] bg-[var(--sp-surface)] text-xs uppercase tracking-wider text-[var(--sp-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Transaction ID / Ref</th>
                  <th className="px-4 py-3 font-semibold">Sender Name</th>
                  <th className="px-4 py-3 font-semibold">Platform Bank</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sp-border)]">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--sp-surface)]/70">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${row.userId}`}
                        className="font-medium text-[var(--sp-navy)] hover:underline"
                      >
                        {row.userEmail}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--sp-navy)]">
                      ₦{formatAmount(row.amount, row.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-[var(--sp-lime-deep)] block">
                          {row.senderTransactionId || row.providerRef || "—"}
                        </span>
                        {row.receiptUrl && (
                          <a
                            href={row.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline mt-0.5"
                          >
                            <span>📎 View Receipt</span>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--sp-muted)]">
                      {row.senderName ? (
                        <span className="font-medium text-[var(--sp-navy)]">
                          {row.senderName}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--sp-muted)]">
                      {row.paymentBankName ? (
                        <div>
                          <p className="font-medium text-[var(--sp-navy)]">
                            {row.paymentBankName}
                          </p>
                          <p className="font-mono text-[11px]">
                            {row.paymentAccountNumber}
                          </p>
                        </div>
                      ) : (
                        "Bank Transfer"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--sp-muted)]">
                      {new Date(row.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/deposits/${row.id}`}
                        className="inline-block rounded-lg bg-[var(--sp-surface)] px-3 py-1.5 text-xs font-bold text-[var(--sp-navy)] transition hover:bg-[var(--sp-lime-deep)] hover:text-white"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
