"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../_components/investor-page";

type Pkg = {
  id: string;
  name: string;
  projectName: string;
  lotPrice: string;
  returnRate: string;
  durationDays: number;
  availableLots: number;
  status: string;
};

export default function PackagesPage() {
  const [items, setItems] = useState<Pkg[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/marketplace/packages");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setItems(json.data.items);
    })();
  }, []);

  return (
    <InvestorPage title="Packages">
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((pkg) => (
          <li key={pkg.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/packages/${pkg.id}`}
            >
              <span className="font-medium">{pkg.name}</span>
              <span className="text-sm text-slate-400">
                {pkg.projectName} · {formatAmount(pkg.lotPrice)} / lot ·{" "}
                {pkg.returnRate}% · {pkg.durationDays}d · {pkg.availableLots}{" "}
                lots
              </span>
            </Link>
          </li>
        ))}
        {items.length === 0 && !error ? (
          <li className="px-4 py-3 text-slate-500">No open packages.</li>
        ) : null}
      </ul>
    </InvestorPage>
  );
}
