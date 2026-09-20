"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminNav } from "../_components/admin-nav";

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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">Reports</h1>
      <AdminNav />
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-400">
          From
          <input
            type="date"
            className="mt-1 block rounded border border-slate-600 bg-slate-900 px-3 py-2"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm text-slate-400">
          To
          <input
            type="date"
            className="mt-1 block rounded border border-slate-600 bg-slate-900 px-3 py-2"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-emerald-700 px-3 py-2"
        >
          {loading ? "Loading…" : "Apply"}
        </button>
      </form>
      {error ? <p className="text-red-400">{error}</p> : null}

      {summary ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Stat label="New users" value={summary.users.newUsers} />
            <Stat label="Verified (KYC)" value={summary.users.verifiedUsers} />
            <Stat
              label="Active investors"
              value={summary.users.activeInvestors}
            />
            <Stat label="Investment volume" value={summary.investments.volume} />
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
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Package performance</h2>
            <ul className="divide-y divide-slate-800 rounded border border-slate-800">
              {summary.investments.packagePerformance.map((p) => (
                <li key={p.packageId} className="px-4 py-2 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-slate-400">
                    {" "}
                    · sold {p.soldLots} · principal {p.principal}
                  </span>
                </li>
              ))}
              {summary.investments.packagePerformance.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500">No packages</li>
              ) : null}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <StatusTable title="Deposits" rows={summary.financial.deposits} />
            <StatusTable
              title="Withdrawals"
              rows={summary.financial.withdrawals}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Wallet activity</h2>
            <ul className="divide-y divide-slate-800 rounded border border-slate-800">
              {summary.financial.wallet.map((w) => (
                <li key={w.direction} className="px-4 py-2 text-sm">
                  {w.direction}: {w.amount} ({w.count} txns)
                </li>
              ))}
              {summary.financial.wallet.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500">No activity</li>
              ) : null}
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">CSV export</h2>
            <div className="flex flex-wrap gap-2">
              {EXPORT_KINDS.map((kind) => (
                <a
                  key={kind}
                  className="rounded border border-slate-600 px-3 py-2 text-sm text-emerald-400"
                  href={`/api/admin/reports/${kind}/export${qs()}`}
                >
                  {kind}.csv
                </a>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-slate-800 px-4 py-3">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusTable({
  title,
  rows,
}: {
  title: string;
  rows: { status: string; count: number; amount: number }[];
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {rows.map((r) => (
          <li key={r.status} className="px-4 py-2 text-sm">
            {r.status}: {r.count} · {r.amount}
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-4 py-3 text-sm text-slate-500">None in range</li>
        ) : null}
      </ul>
    </div>
  );
}
