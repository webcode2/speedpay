"use client";

import { useEffect, useState } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminSelect,
  AdminTable,
  RowLink,
  StatusPill,
} from "../_components/ui";

type Item = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  userEmail: string;
  bankName: string;
  accountName: string;
  accountNumberMasked: string;
  createdAt: string;
};

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(nextStatus = status) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/withdrawals?status=${encodeURIComponent(nextStatus)}`,
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load withdrawals");
        return;
      }
      setItems(json.data.items);
      setError(null);
    } catch {
      setError("Network error loading withdrawals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        title="Withdrawal requests"
        subtitle="Review, approve, and process user cash payout withdrawals"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--sp-muted)]">Filter:</span>
            <AdminSelect
              value={status}
              onChange={(v) => {
                setStatus(v);
                void load(v);
              }}
            >
              <option value="PENDING">PENDING (Awaiting Approval)</option>
              <option value="APPROVED">APPROVED (Ready to Process)</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="ALL">ALL STATUSES</option>
            </AdminSelect>
          </div>
        }
      />

      {error ? <p className="mb-3 text-[var(--sp-danger)] font-medium text-sm">{error}</p> : null}

      <AdminTable
        columns={["User", "Amount", "Bank Account", "Requested At", "Status", ""]}
        empty={loading ? "Loading withdrawals..." : items.length === 0 ? "No withdrawal requests found." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70 transition">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.userEmail}
            </td>
            <td className="px-4 py-3 font-mono font-bold text-emerald-700">
              ₦{Number(item.amount).toLocaleString()}
            </td>
            <td className="px-4 py-3">
              <div className="text-xs font-semibold text-[var(--sp-navy)]">{item.bankName}</div>
              <div className="text-[11px] text-[var(--sp-muted)] font-mono">
                {item.accountNumberMasked} · {item.accountName}
              </div>
            </td>
            <td className="px-4 py-3 text-xs text-[var(--sp-muted)]">
              {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={item.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/withdrawals/${item.id}`}>Review</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
