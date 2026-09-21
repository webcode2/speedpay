"use client";

import { useEffect, useState } from "react";
import {
  AdminPageHeader,
  AdminTable,
  RowLink,
} from "../_components/ui";

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
    <div className="w-full">
      <AdminPageHeader
        title="Roles"
        subtitle="Permission bundles for staff accounts"
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["Code", "Name", "Permissions", "Description", ""]}
        empty={items.length === 0 ? "No roles." : undefined}
      >
        {items.map((r) => (
          <tr key={r.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-mono text-sm text-[var(--sp-navy)]">
              {r.code}
            </td>
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {r.name}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {r.permissions.length}
            </td>
            <td className="max-w-xs truncate px-4 py-3 text-[var(--sp-muted)]">
              {r.description ?? "—"}
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/roles/${r.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
