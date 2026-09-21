"use client";

import { useEffect, useState } from "react";
import { hasAnyPermission } from "@/permissions/visibility";
import { useAdminPermissions } from "../_components/admin-shell";
import {
  AdminInput,
  AdminPageHeader,
  AdminPrimaryButton,
  AdminTable,
  RowLink,
  StatusPill,
} from "../_components/ui";

type Item = {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
};

export default function AdminStaffPage() {
  const permissions = useAdminPermissions();
  const canCreate = hasAnyPermission(permissions, ["staff.create"]);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(search = q) {
    const params = new URLSearchParams({ limit: "50" });
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/admin/staff?${params}`);
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
        title="Staff"
        subtitle={`${total} accounts`}
        actions={
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void load();
              }}
            >
              <AdminInput
                placeholder="Search staff"
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
            {canCreate ? (
              <AdminPrimaryButton href="/admin/staff/new">
                + New staff
              </AdminPrimaryButton>
            ) : null}
          </>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["Name", "Email", "Roles", "Status", ""]}
        empty={items.length === 0 ? "No staff." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.name}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">{item.email}</td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.roles.join(", ") || "—"}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={item.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/staff/${item.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
