"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  status: string;
  userEmail: string;
  submittedAt: string | null;
};

export default function AdminKycQueuePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);

  async function load(nextStatus = status) {
    const res = await fetch(`/api/admin/kyc?status=${encodeURIComponent(nextStatus)}`);
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
        <h1 className="text-3xl font-semibold">KYC queue</h1>
        <Link className="text-sm text-emerald-400" href="/admin/login">
          Staff login
        </Link>
      </div>
      <select
        className="w-48 rounded border border-slate-600 bg-slate-900 px-3 py-2"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          void load(e.target.value);
        }}
      >
        {["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "REQUIRES_INFORMATION"].map(
          (s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ),
        )}
      </select>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{item.userEmail}</p>
              <p className="text-sm text-slate-400">{item.status}</p>
            </div>
            <Link className="text-emerald-400" href={`/admin/kyc/${item.id}`}>
              Review
            </Link>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="py-6 text-slate-500">No requests in this filter.</li>
        ) : null}
      </ul>
    </main>
  );
}
