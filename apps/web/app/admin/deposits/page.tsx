"use client";

import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import {
  AdminPageHeader,
  AdminSelect,
  AdminTable,
  RowLink,
  StatusPill,
} from "../_components/ui";

type Item = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  userEmail: string;
};

export default function AdminDepositsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function load(next = status) {
    const params = new URLSearchParams({ limit: "50" });
    if (next) params.set("status", next);
    const res = await fetch(`/api/admin/deposits?${params}`);
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
        title="Deposits"
        subtitle={`${total} records`}
        actions={
          <AdminSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              void load(v);
            }}
          >
            <option value="">All</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </AdminSelect>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["User", "Amount", "Status", ""]}
        empty={items.length === 0 ? "No deposits." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.userEmail}
            </td>
            <td className="px-4 py-3">
              {formatAmount(item.amount, item.currency)}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={item.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/deposits/${item.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
