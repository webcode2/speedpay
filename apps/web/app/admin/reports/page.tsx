"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTable,
  StatusPill,
} from "../_components/ui";

type Summary = {
  range: { from: string | null; to: string | null };
  users: {
    newUsers: number;
    verifiedUsers: number;
    activeInvestors: number;
  };
  investments: {
    volume: number;
    activeCount: number;
    maturedCount: number;
    packagePerformance: {
      packageId: string;
      name: string;
      soldLots: number;
      principal: number;
    }[];
  };
  financial: {
    deposits: { status: string; count: number; amount: number }[];
    withdrawals: { status: string; count: number; amount: number }[];
    returnsMaterialized: number;
    wallet: { direction: string; amount: number; count: number }[];
  };
};

const EXPORT_KINDS = [
  "users",
  "investments",
  "deposits",
  "withdrawals",
  "returns",
  "wallet",
] as const;

export default function AdminReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function qs() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const s = params.toString();
    return s ? `?${s}` : "";
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/summary${qs()}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setSummary(json.data.summary);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Reports"
        subtitle="Operational summary and CSV exports"
        actions={
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-[var(--sp-muted)]">
              From
              <AdminInput
                type="date"
                className="mt-1"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-[var(--sp-muted)]">
              To
              <AdminInput
                type="date"
                className="mt-1"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[var(--sp-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Loading…" : "Apply"}
            </button>
          </form>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}

      {summary ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="New users" value={summary.users.newUsers} />
            <Stat label="Verified (KYC)" value={summary.users.verifiedUsers} />
            <Stat
              label="Active investors"
              value={summary.users.activeInvestors}
            />
            <Stat
              label="Investment volume"
              value={summary.investments.volume}
            />
            <Stat
              label="Active investments"
              value={summary.investments.activeCount}
            />
            <Stat
              label="Matured investments"
              value={summary.investments.maturedCount}
            />
            <Stat
              label="Returns materialized"
              value={summary.financial.returnsMaterialized}
            />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-[var(--sp-navy)]">
              Package performance
            </h2>
            <AdminTable
              columns={["Package", "Sold lots", "Principal"]}
              empty={
                summary.investments.packagePerformance.length === 0
                  ? "No packages"
                  : undefined
              }
            >
              {summary.investments.packagePerformance.map((p) => (
                <tr key={p.packageId} className="hover:bg-[var(--sp-surface)]/70">
                  <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
                    {p.name}
                  </td>
                  <td className="px-4 py-3">{p.soldLots}</td>
                  <td className="px-4 py-3">{p.principal}</td>
                </tr>
              ))}
            </AdminTable>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StatusBlock title="Deposits" rows={summary.financial.deposits} />
            <StatusBlock
              title="Withdrawals"
              rows={summary.financial.withdrawals}
            />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-[var(--sp-navy)]">
              Wallet activity
            </h2>
            <AdminTable
              columns={["Direction", "Amount", "Txns"]}
              empty={
                summary.financial.wallet.length === 0
                  ? "No activity"
                  : undefined
              }
            >
              {summary.financial.wallet.map((w) => (
                <tr key={w.direction} className="hover:bg-[var(--sp-surface)]/70">
                  <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
                    {w.direction}
                  </td>
                  <td className="px-4 py-3">{w.amount}</td>
                  <td className="px-4 py-3 text-[var(--sp-muted)]">{w.count}</td>
                </tr>
              ))}
            </AdminTable>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-[var(--sp-navy)]">
              CSV export
            </h2>
            <div className="flex flex-wrap gap-2">
              {EXPORT_KINDS.map((kind) => (
                <a
                  key={kind}
                  className="rounded-xl border border-[var(--sp-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--sp-navy)] hover:bg-[var(--sp-lime-mint)]"
                  href={`/api/admin/reports/${kind}/export${qs()}`}
                >
                  {kind}.csv
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <AdminCard className="!p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--sp-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--sp-navy)]">{value}</p>
    </AdminCard>
  );
}

function StatusBlock({
  title,
  rows,
}: {
  title: string;
  rows: { status: string; count: number; amount: number }[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-[var(--sp-navy)]">
        {title}
      </h2>
      <AdminTable
        columns={["Status", "Count", "Amount"]}
        empty={rows.length === 0 ? "None in range" : undefined}
      >
        {rows.map((r) => (
          <tr key={r.status} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3">
              <StatusPill status={r.status} />
            </td>
            <td className="px-4 py-3">{r.count}</td>
            <td className="px-4 py-3">{r.amount}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
