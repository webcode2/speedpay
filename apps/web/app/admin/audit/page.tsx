"use client";

import { useEffect, useState } from "react";
import {
  AdminInput,
  AdminPageHeader,
  AdminTable,
  RowLink,
} from "../_components/ui";

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
    <div className="w-full">
      <AdminPageHeader
        title="Audit log"
        subtitle={`${total} events`}
        actions={
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <AdminInput
              placeholder="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
            <AdminInput
              placeholder="Entity type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--sp-navy)] px-4 py-2 text-sm font-semibold text-white"
            >
              Filter
            </button>
          </form>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["When", "Action", "Entity", "Actor", "IP", ""]}
        empty={items.length === 0 ? "No audit events." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {new Date(item.createdAt).toLocaleString()}
            </td>
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.action}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.entityType}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.actorType}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.ipAddress ?? "—"}
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/audit/${item.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
