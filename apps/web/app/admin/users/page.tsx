"use client";

import { useEffect, useState } from "react";
import {
  AdminInput,
  AdminPageHeader,
  AdminTable,
  RowLink,
  StatusPill,
} from "../_components/ui";

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
    <div className="w-full">
      <AdminPageHeader
        title="Users"
        subtitle={`${total} investors`}
        actions={
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <AdminInput
              placeholder="Search email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--sp-navy)] px-4 py-2 text-sm font-semibold text-white"
            >
              Search
            </button>
          </form>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["Name", "Email", "Status", ""]}
        empty={items.length === 0 ? "No users found." : undefined}
      >
        {items.map((u) => (
          <tr key={u.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">{u.email}</td>
            <td className="px-4 py-3">
              <StatusPill status={u.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/users/${u.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
