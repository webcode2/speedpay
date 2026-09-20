"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "../_components/admin-nav";

type Item = {
  id: string;
  userEmail: string;
  packageName: string;
  projectName: string;
  principal: number;
  accruedReturn: number;
  deltaAccrued: number;
  priorMaterialized: number;
  eligible: boolean;
};

export default function AdminReturnsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/returns");
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
      <h1 className="text-3xl font-semibold">Return materialization</h1>
      <AdminNav />
      <p className="text-sm text-slate-400">
        Eligible ACTIVE investments with unrealized accrued return (credits PENDING).
      </p>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.length === 0 && !error ? (
          <li className="px-4 py-3 text-slate-400">No eligible investments.</li>
        ) : null}
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/returns/${item.id}`}
            >
              <span className="font-medium">{item.userEmail}</span>
              <span className="text-sm text-slate-400">
                {item.packageName} · {item.projectName} · principal {item.principal} ·
                delta {item.deltaAccrued} (prior {item.priorMaterialized})
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
