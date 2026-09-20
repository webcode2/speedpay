"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
  status: string;
  projectName?: string;
  availableLots: number;
  totalLots: number;
  lotPrice: string;
};

export default function AdminPackagesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(next = status) {
    const qs = next ? `?status=${encodeURIComponent(next)}` : "";
    const res = await fetch(`/api/admin/packages${qs}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed");
      return;
    }
    setItems(json.data.items);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Packages</h1>
        <div className="flex gap-3 text-sm">
          <Link className="text-emerald-400" href="/admin/packages/new">
            New
          </Link>
          <Link className="text-emerald-400" href="/admin/projects">
            Projects
          </Link>
        </div>
      </div>
      <select
        className="w-fit rounded border border-slate-600 bg-slate-900 px-3 py-2"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          void load(e.target.value);
        }}
      >
        <option value="">All</option>
        {["DRAFT", "OPEN", "FULL", "PAUSED", "CLOSED", "ARCHIVED"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="block px-4 py-3 hover:bg-slate-900"
              href={`/admin/packages/${item.id}`}
            >
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-slate-400">
                {item.projectName} · {item.status} · {item.availableLots}/
                {item.totalLots} lots · {item.lotPrice}
              </div>
            </Link>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="px-4 py-6 text-sm text-slate-500">No packages</li>
        ) : null}
      </ul>
    </main>
  );
}
