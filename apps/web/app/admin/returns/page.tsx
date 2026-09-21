"use client";

import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import {
  AdminPageHeader,
  AdminTable,
  RowLink,
  StatusPill,
} from "../_components/ui";

type Item = {
  id: string;
  userEmail: string;
  packageName: string;
  projectName: string;
  principal: number;
  accruedReturn: number;
  deltaAccrued: number;
  priorMaterialized: number;
  eligible: boolean;
};

export default function AdminReturnsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/returns");
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
  }, []);

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Return materialization"
        subtitle="Eligible ACTIVE investments with unrealized accrued return"
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={[
          "Investor",
          "Package",
          "Principal",
          "Delta accrued",
          "Prior",
          "Eligible",
          "",
        ]}
        empty={items.length === 0 ? "No eligible investments." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.userEmail}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.packageName}
              <span className="block text-xs">{item.projectName}</span>
            </td>
            <td className="px-4 py-3">{formatAmount(item.principal)}</td>
            <td className="px-4 py-3">{formatAmount(item.deltaAccrued)}</td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {formatAmount(item.priorMaterialized)}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={item.eligible ? "ELIGIBLE" : "HELD"} />
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/returns/${item.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
