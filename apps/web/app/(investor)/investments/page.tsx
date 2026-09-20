"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../_components/investor-page";

type Item = {
  id: string;
  status: string;
  principal: number;
  packageName: string;
  projectName: string;
  accruedReturn: number;
  percentageComplete: number;
};

export default function InvestmentsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/investments");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setItems(json.data.items);
    })();
  }, []);

  return (
    <InvestorPage title="My Investments">
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/investments/${item.id}`}
            >
              <span className="font-medium">{item.packageName}</span>
              <span className="text-sm text-slate-400">
                {item.projectName} · {item.status} ·{" "}
                {formatAmount(item.principal)} · accrued{" "}
                {formatAmount(item.accruedReturn)} ·{" "}
                {Math.round(item.percentageComplete)}%
              </span>
            </Link>
          </li>
        ))}
        {items.length === 0 && !error ? (
          <li className="px-4 py-3 text-slate-500">No investments yet.</li>
        ) : null}
      </ul>
    </InvestorPage>
  );
}
