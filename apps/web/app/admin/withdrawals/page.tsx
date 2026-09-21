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
  userEmail: string;
  amount: number;
  currency: string;
  status: string;
  bankName: string;
  accountNumberMasked: string;
};

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);

  async function load(nextStatus = status) {
    const res = await fetch(
      `/api/admin/withdrawals?status=${encodeURIComponent(nextStatus)}`,
    );
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setItems(json.data.items ?? []);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Withdrawals"
        subtitle="Payout processing queue"
        actions={
          <AdminSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              void load(v);
            }}
          >
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PROCESSED">PROCESSED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </AdminSelect>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["User", "Amount", "Bank", "Account", "Status", ""]}
        empty={items.length === 0 ? "No withdrawals." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.userEmail}
            </td>
            <td className="px-4 py-3">
              {formatAmount(item.amount, item.currency)}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">{item.bankName}</td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.accountNumberMasked}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={item.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/withdrawals/${item.id}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
