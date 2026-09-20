"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  status: string;
  userEmail: string;
  bankName: string;
  accountNumberMasked: string;
  accountName: string;
};

export default function AdminPayoutsQueuePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);

  async function load(nextStatus = status) {
    const res = await fetch(
      `/api/admin/payouts?status=${encodeURIComponent(nextStatus)}`,
    );
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Payout accounts</h1>
        <div className="flex gap-3 text-sm">
          <Link className="text-emerald-400" href="/admin/projects">
            Projects
          </Link>
          <Link className="text-emerald-400" href="/admin/returns">
            Returns
          </Link>
          <Link className="text-emerald-400" href="/admin/kyc">
            KYC
          </Link>
          <Link className="text-emerald-400" href="/admin/login">
            Staff login
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
        <option value="PENDING">PENDING</option>
        <option value="VERIFIED">VERIFIED</option>
        <option value="REJECTED">REJECTED</option>
      </select>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/payouts/${item.id}`}
            >
              <span className="font-medium">{item.userEmail}</span>
              <span className="text-sm text-slate-400">
                {item.bankName} · {item.accountName} · {item.accountNumberMasked} ·{" "}
                {item.status}
              </span>
            </Link>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="px-4 py-6 text-sm text-slate-500">No accounts</li>
        ) : null}
      </ul>
    </main>
  );
}
