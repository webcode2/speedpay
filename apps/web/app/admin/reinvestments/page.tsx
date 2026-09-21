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
  amount: number;
  userEmail: string;
  parentInvestmentId: string;
  newInvestmentId: string;
  newPackageName: string;
  createdAt: string;
};

export default function AdminReinvestmentsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/reinvestments");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setItems(json.data.items);
      setTotal(json.data.total);
    })();
  }, []);

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Reinvestments"
        subtitle={`${total} reinvestments`}
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={[
          "Investor",
          "Amount",
          "New package",
          "When",
          "Parent",
          "New",
        ]}
        empty={items.length === 0 ? "No reinvestments yet." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.userEmail}
            </td>
            <td className="px-4 py-3">{formatAmount(item.amount)}</td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.newPackageName}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {new Date(item.createdAt).toLocaleString()}
            </td>
            <td className="px-4 py-3">
              <RowLink href={`/admin/investments/${item.parentInvestmentId}`}>
                Parent
              </RowLink>
            </td>
            <td className="px-4 py-3">
              <RowLink href={`/admin/investments/${item.newInvestmentId}`}>
                Open
              </RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
