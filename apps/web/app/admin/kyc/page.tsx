"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "../_components/admin-nav";

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
      <h1 className="text-3xl font-semibold">KYC queue</h1>
      <AdminNav />
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
        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
        <option value="APPROVED">APPROVED</option>
        <option value="REJECTED">REJECTED</option>
        <option value="REQUIRES_INFORMATION">REQUIRES_INFORMATION</option>
      </select>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/kyc/${item.id}`}
            >
              <span className="font-medium">{item.userEmail}</span>
              <span className="text-sm text-slate-400">
                {item.status}
                {item.submittedAt ? ` · ${item.submittedAt}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
