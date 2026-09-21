"use client";

import { useEffect, useState } from "react";
import {
  AdminPageHeader,
  AdminPrimaryButton,
  AdminSelect,
  AdminTable,
  RowLink,
  StatusPill,
} from "../_components/ui";

type Item = {
  id: string;
  name: string;
  status: string;
  location: string | null;
};

export default function AdminProjectsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(nextStatus = status) {
    const qs = nextStatus ? `?status=${encodeURIComponent(nextStatus)}` : "";
    const res = await fetch(`/api/admin/projects${qs}`);
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
    <div className="w-full">
      <AdminPageHeader
        title="Projects"
        subtitle="Solar / asset projects"
        actions={
          <>
            <AdminSelect
              value={status}
              onChange={(v) => {
                setStatus(v);
                void load(v);
              }}
            >
              <option value="">All</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </AdminSelect>
            <AdminPrimaryButton href="/admin/projects/new">
              + New project
            </AdminPrimaryButton>
          </>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["Name", "Location", "Status", ""]}
        empty={items.length === 0 ? "No projects." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.name}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.location ?? "—"}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={item.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/projects/${item.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
