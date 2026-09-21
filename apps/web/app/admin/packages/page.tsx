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
  projectName?: string;
  availableLots: number;
  totalLots: number;
  lotPrice: string;
};

export default function AdminPackagesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(next = status) {
    const qs = next ? `?status=${encodeURIComponent(next)}` : "";
    const res = await fetch(`/api/admin/packages${qs}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed");
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
        title="Packages"
        subtitle="Investment products"
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
              <option value="OPEN">OPEN</option>
              <option value="FULL">FULL</option>
              <option value="PAUSED">PAUSED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </AdminSelect>
            <AdminPrimaryButton href="/admin/packages/new">
              + New package
            </AdminPrimaryButton>
          </>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["Package", "Project", "Lots", "Price", "Status", ""]}
        empty={items.length === 0 ? "No packages." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.name}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.projectName ?? "—"}
            </td>
            <td className="px-4 py-3">
              {item.availableLots}/{item.totalLots}
            </td>
            <td className="px-4 py-3">{item.lotPrice}</td>
            <td className="px-4 py-3">
              <StatusPill status={item.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/packages/${item.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
