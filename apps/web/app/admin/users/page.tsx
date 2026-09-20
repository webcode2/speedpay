"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminNav } from "../_components/admin-nav";

type Item = {
  id: string;
  email: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(search = q) {
    const params = new URLSearchParams({ limit: "50" });
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/admin/users?${params}`);
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
      <h1 className="text-3xl font-semibold">Users</h1>
      <AdminNav />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Search email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="rounded bg-emerald-700 px-3 py-2">
          Search
        </button>
      </form>
      <p className="text-sm text-slate-400">{total} users</p>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((u) => (
          <li key={u.id}>
            <Link
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-900"
              href={`/admin/users/${u.id}`}
            >
              <span className="font-medium">{u.email}</span>
              <span className="text-sm text-slate-400">
                {u.status}
                {u.firstName || u.lastName
                  ? ` · ${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                  : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
