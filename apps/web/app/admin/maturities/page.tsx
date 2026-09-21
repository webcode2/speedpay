"use client";

import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import {
  AdminPageHeader,
  AdminTable,
  RowLink,
} from "../_components/ui";

type Item = {
  id: string;
  userEmail: string;
  packageName: string;
  principal: number;
  maturityValue: number;
  priorAccrued: number;
  maturityAt: string;
};

export default function AdminMaturitiesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/maturities");
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
        title="Maturities"
        subtitle="Due ACTIVE investments awaiting manual maturity processing"
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={[
          "Investor",
          "Package",
          "Principal",
          "Maturity value",
          "Prior accrued",
          "Due",
          "",
        ]}
        empty={items.length === 0 ? "No due maturities." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.userEmail}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.packageName}
            </td>
            <td className="px-4 py-3">{formatAmount(item.principal)}</td>
            <td className="px-4 py-3 font-semibold text-[var(--sp-navy)]">
              {formatAmount(item.maturityValue)}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {formatAmount(item.priorAccrued)}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {new Date(item.maturityAt).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/maturities/${item.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
