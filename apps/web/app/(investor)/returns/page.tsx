"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../_components/investor-page";

type ReturnsData = {
  asOf?: string;
  totals?: {
    principal?: number;
    accruedReturn?: number;
    expectedReturn?: number;
    maturityValue?: number;
    todayReturn?: number;
  };
  items?: {
    investmentId: string;
    packageName?: string;
    accruedReturn: number;
    percentageComplete: number;
  }[];
};

export default function ReturnsPage() {
  const [data, setData] = useState<ReturnsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/returns");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setData(json.data.returns ?? json.data);
    })();
  }, []);

  const totals = data?.totals ?? {};

  return (
    <InvestorPage title="Returns">
      {error ? <p className="text-red-400">{error}</p> : null}
      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-slate-800 px-4 py-3">
              <p className="text-sm text-slate-400">Today</p>
              <p className="text-xl">{formatAmount(totals.todayReturn)}</p>
            </div>
            <div className="rounded border border-slate-800 px-4 py-3">
              <p className="text-sm text-slate-400">Accrued</p>
              <p className="text-xl">{formatAmount(totals.accruedReturn)}</p>
            </div>
            <div className="rounded border border-slate-800 px-4 py-3">
              <p className="text-sm text-slate-400">Expected</p>
              <p className="text-xl">{formatAmount(totals.expectedReturn)}</p>
            </div>
            <div className="rounded border border-slate-800 px-4 py-3">
              <p className="text-sm text-slate-400">Maturity value</p>
              <p className="text-xl">{formatAmount(totals.maturityValue)}</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-800 rounded border border-slate-800">
            {(data.items ?? []).map((item) => (
              <li key={item.investmentId}>
                <Link
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
                  href={`/investments/${item.investmentId}`}
                >
                  <span className="font-medium">
                    {item.packageName ?? item.investmentId}
                  </span>
                  <span className="text-sm text-slate-400">
                    Accrued {formatAmount(item.accruedReturn)} ·{" "}
                    {Math.round(item.percentageComplete)}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        !error && <p className="text-slate-400">Loading…</p>
      )}
    </InvestorPage>
  );
}
