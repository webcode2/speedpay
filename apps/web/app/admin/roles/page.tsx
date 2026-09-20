"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "../_components/admin-nav";

type Item = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
};

export default function AdminRolesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/roles");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setItems(json.data.items);
      setError(null);
    })();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">Roles</h1>
      <AdminNav />
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/roles/${r.id}`}
            >
              <span className="font-medium">
                {r.code} — {r.name}
              </span>
              <span className="text-sm text-slate-400">
                {r.permissions.length} permissions
                {r.description ? ` · ${r.description}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
