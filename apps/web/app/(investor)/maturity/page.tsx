"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../_components/investor-page";

type MaturityItem = {
  id: string;
  packageName?: string;
  principal?: number;
  maturityValue?: number;
  maturityAt?: string;
  status?: string;
};

export default function MaturityPage() {
  const [eligible, setEligible] = useState<MaturityItem[]>([]);
  const [processed, setProcessed] = useState<MaturityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/maturities");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setEligible(json.data.eligible ?? []);
      setProcessed(json.data.processed ?? []);
    })();
  }, []);

  return (
    <InvestorPage title="Maturity">
      {error ? <p className="text-red-400">{error}</p> : null}
      <h2 className="text-lg font-medium">Eligible</h2>
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {eligible.map((item) => (
          <li key={item.id}>
            <Link
              className="block px-4 py-3 text-sm hover:bg-slate-900"
              href={`/investments/${item.id}`}
            >
              {item.packageName ?? item.id} ·{" "}
              {formatAmount(item.maturityValue ?? item.principal)}
              {item.maturityAt
                ? ` · ${new Date(item.maturityAt).toLocaleDateString()}`
                : ""}
            </Link>
          </li>
        ))}
        {eligible.length === 0 ? (
          <li className="px-4 py-3 text-slate-500">None eligible.</li>
        ) : null}
      </ul>
      <h2 className="text-lg font-medium">Processed</h2>
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {processed.map((item) => (
          <li key={item.id} className="px-4 py-3 text-sm">
            {item.packageName ?? item.id} · {item.status ?? "DONE"} ·{" "}
            {formatAmount(item.maturityValue ?? item.principal)}
          </li>
        ))}
        {processed.length === 0 ? (
          <li className="px-4 py-3 text-slate-500">None processed.</li>
        ) : null}
      </ul>
      <Link className="text-sm text-emerald-400" href="/reinvest">
        Reinvest matured funds →
      </Link>
    </InvestorPage>
  );
}
