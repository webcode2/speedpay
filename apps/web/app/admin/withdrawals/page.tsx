"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  bankName: string;
  accountNumberMasked: string;
};

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);

  async function load(nextStatus = status) {
    const res = await fetch(
      `/api/admin/withdrawals?status=${encodeURIComponent(nextStatus)}`,
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
        <h1 className="text-3xl font-semibold">Withdrawals</h1>
        <div className="flex gap-3 text-sm">
          <Link className="text-emerald-400" href="/admin/returns">
            Returns
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
        <option value="PENDING">PENDING</option>
        <option value="APPROVED">APPROVED</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="REJECTED">REJECTED</option>
        <option value="CANCELLED">CANCELLED</option>
      </select>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.length === 0 && !error ? (
          <li className="px-4 py-3 text-slate-400">No withdrawals.</li>
        ) : null}
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/withdrawals/${item.id}`}
            >
              <span className="font-medium">{item.userEmail}</span>
              <span className="text-sm text-slate-400">
                {item.amount} {item.currency} · {item.bankName} ·{" "}
                {item.accountNumberMasked} · {item.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
