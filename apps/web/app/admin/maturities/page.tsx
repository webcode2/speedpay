"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "../_components/admin-nav";

type Item = {
  id: string;
  userEmail: string;
  packageName: string;
  principal: number;
  maturityValue: number;
  priorAccrued: number;
  maturityAt: string;
};

export default function AdminMaturitiesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/maturities");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setItems(json.data.items);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">Maturities</h1>
      <AdminNav />
      <p className="text-sm text-slate-400">
        Due ACTIVE investments awaiting manual maturity processing.
      </p>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.length === 0 && !error ? (
          <li className="px-4 py-3 text-slate-400">No due maturities.</li>
        ) : null}
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/maturities/${item.id}`}
            >
              <span className="font-medium">{item.userEmail}</span>
              <span className="text-sm text-slate-400">
                {item.packageName} · maturity value {item.maturityValue} · prior
                accrued {item.priorAccrued} · due {item.maturityAt}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
