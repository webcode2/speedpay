"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "../_components/admin-nav";

type Item = {
  id: string;
  status: string;
  principal: number;
  userEmail: string;
  packageName: string;
};

export default function AdminInvestmentsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function load(next = status) {
    const params = new URLSearchParams({ limit: "50" });
    if (next) params.set("status", next);
    const res = await fetch(`/api/admin/investments?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setItems(json.data.items);
    setTotal(json.data.total);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">Investments</h1>
      <AdminNav />
      <select
        className="w-fit rounded border border-slate-600 bg-slate-900 px-3 py-2"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          void load(e.target.value);
        }}
      >
        <option value="">All</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="MATURED">MATURED</option>
        <option value="REINVESTED">REINVESTED</option>
        <option value="COMPLETED">COMPLETED</option>
      </select>
      <p className="text-sm text-slate-400">{total} investments</p>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/investments/${item.id}`}
            >
              <span className="font-medium">{item.userEmail}</span>
              <span className="text-sm text-slate-400">
                {item.packageName} · {item.principal} · {item.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
