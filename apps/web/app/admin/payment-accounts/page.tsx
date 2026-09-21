"use client";

import { useEffect, useState } from "react";
import {
  AdminPageHeader,
  AdminPrimaryButton,
  AdminTable,
  RowLink,
  StatusPill,
} from "../_components/ui";

type Item = {
  id: string;
  type: string;
  label: string;
  accountName: string;
  accountNumber: string;
  status: string;
};

export default function AdminPaymentAccountsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/payment-accounts");
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

  async function setStatus(id: string, action: "publish" | "disable") {
    const res = await fetch(`/api/admin/payment-accounts/${id}/${action}`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Action failed");
      return;
    }
    await load();
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Payment accounts"
        subtitle="Platform accounts investors use to fund deposits"
        actions={
          <AdminPrimaryButton href="/admin/payment-accounts/new">
            + New account
          </AdminPrimaryButton>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["Label", "Type", "Account name", "Number", "Status", ""]}
        empty={items.length === 0 ? "No payment accounts yet." : undefined}
      >
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              {item.label}
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">{item.type}</td>
            <td className="px-4 py-3">{item.accountName}</td>
            <td className="px-4 py-3 font-mono text-sm">{item.accountNumber}</td>
            <td className="px-4 py-3">
              <StatusPill status={item.status} />
            </td>
            <td className="space-x-3 px-4 py-3 text-right">
              <RowLink href={`/admin/payment-accounts/${item.id}`}>Open</RowLink>
              {item.status === "PUBLISHED" ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--sp-danger)]"
                  onClick={() => void setStatus(item.id, "disable")}
                >
                  Disable
                </button>
              ) : (
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--sp-lime-deep)]"
                  onClick={() => void setStatus(item.id, "publish")}
                >
                  Publish
                </button>
              )}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
