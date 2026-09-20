"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
  status: string;
  location: string | null;
};

export default function AdminProjectsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(nextStatus = status) {
    const qs = nextStatus ? `?status=${encodeURIComponent(nextStatus)}` : "";
    const res = await fetch(`/api/admin/projects${qs}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Projects</h1>
        <div className="flex gap-3 text-sm">
          <Link className="text-emerald-400" href="/admin/packages">
            Packages
          </Link>
          <Link className="text-emerald-400" href="/admin/projects/new">
            New
          </Link>
          <Link className="text-emerald-400" href="/admin/kyc">
            KYC
          </Link>
          <Link className="text-emerald-400" href="/admin/payouts">
            Payouts
          </Link>
        </div>
      </div>
      <select
        className="w-fit rounded border border-slate-600 bg-slate-900 px-3 py-2"
        value={status}
        onChange={(e) => {
          const next = e.target.value;
          setStatus(next);
          void load(next);
        }}
      >
        <option value="">All</option>
        <option value="DRAFT">DRAFT</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="PAUSED">PAUSED</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="ARCHIVED">ARCHIVED</option>
      </select>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/projects/${item.id}`}
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-slate-400">
                {item.status}
                {item.location ? ` · ${item.location}` : ""}
              </span>
            </Link>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="px-4 py-6 text-sm text-slate-500">No projects</li>
        ) : null}
      </ul>
    </main>
  );
}
