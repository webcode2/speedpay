"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "../_components/admin-nav";

type Item = {
  id: string;
  amount: number;
  userEmail: string;
  parentInvestmentId: string;
  newInvestmentId: string;
  newPackageName: string;
  createdAt: string;
};

export default function AdminReinvestmentsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/reinvestments");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setItems(json.data.items);
      setTotal(json.data.total);
    })();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">Reinvestments</h1>
      <AdminNav />
      <p className="text-sm text-slate-400">{total} reinvestments</p>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.length === 0 && !error ? (
          <li className="px-4 py-3 text-slate-400">No reinvestments yet.</li>
        ) : null}
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <div className="font-medium">{item.userEmail}</div>
            <div className="text-sm text-slate-400">
              {item.amount} → {item.newPackageName} ·{" "}
              <Link
                className="text-emerald-400"
                href={`/admin/investments/${item.newInvestmentId}`}
              >
                new
              </Link>{" "}
              from{" "}
              <Link
                className="text-emerald-400"
                href={`/admin/investments/${item.parentInvestmentId}`}
              >
                parent
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
