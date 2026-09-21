"use client";

import { useEffect, useState } from "react";
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
  userEmail: string;
  submittedAt: string | null;
};

export default function AdminKycQueuePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);

  async function load(nextStatus = status) {
    const res = await fetch(
      `/api/admin/kyc?status=${encodeURIComponent(nextStatus)}`,
    );
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
        title="KYC queue"
        subtitle="Identity verification reviews"
        actions={
          <AdminSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              void load(v);
            }}
          >
            <option value="PENDING">PENDING</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="REQUIRES_INFORMATION">REQUIRES_INFORMATION</option>
          </AdminSelect>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["User", "Submitted", "Status", ""]}
        empty={items.length === 0 ? "No KYC requests." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.userEmail}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {item.submittedAt
                ? new Date(item.submittedAt).toLocaleString()
                : "—"}
            </td>
            <td className="px-4 py-3">
              <StatusPill status={item.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/kyc/${item.id}`}>Review</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
