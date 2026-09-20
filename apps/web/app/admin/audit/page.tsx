"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "../_components/admin-nav";

type Item = {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams({ limit: "50" });
    if (action.trim()) params.set("action", action.trim());
    if (entityType.trim()) params.set("entityType", entityType.trim());
    const res = await fetch(`/api/admin/audit?${params}`);
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">Audit log</h1>
      <AdminNav />
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Action (e.g. KYC_APPROVED)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Entity type"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />
        <button type="submit" className="rounded bg-emerald-700 px-3 py-2">
          Filter
        </button>
      </form>
      <p className="text-sm text-slate-400">{total} events</p>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/audit/${item.id}`}
            >
              <span className="font-medium">{item.action}</span>
              <span className="text-sm text-slate-400">
                {item.entityType}/{item.entityId}
                {item.ipAddress ? ` · ${item.ipAddress}` : ""}
                {" · "}
                {item.createdAt}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
