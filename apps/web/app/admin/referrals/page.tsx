"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminPageHeader,
  AdminTable,
  RowLink,
  StatusPill,
} from "../_components/ui";

type Item = {
  referredUserId: string;
  referredEmail: string;
  accountStatus: string;
  referredAt: string;
  referrerUserId: string;
  referrerEmail: string;
  referrerCode: string;
};

export default function AdminReferralsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [referrers, setReferrers] = useState(0);
  const [subscribed, setSubscribed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/referrals?limit=100");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setItems(json.data.items);
      setTotal(json.data.total);
      setReferrers(json.data.referrers);
      setSubscribed(json.data.subscribedViaReferral);
      setError(null);
    })();
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Referrals"
        subtitle={`${referrers} referrers · ${total} referred accounts · ${subscribed} subscribed`}
      />
      {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
      <AdminTable
        columns={["Referrer", "Code", "Referred account", "Status", "Joined", ""]}
        empty={items.length === 0 ? "No referred accounts yet." : undefined}
      >
        {items.map((row) => (
          <tr key={row.referredUserId} className="hover:bg-[var(--sp-surface)]/70">
            <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
              <Link href={`/admin/users/${row.referrerUserId}`} className="hover:underline">
                {row.referrerEmail}
              </Link>
            </td>
            <td className="px-4 py-3 font-mono text-xs">{row.referrerCode}</td>
            <td className="px-4 py-3">
              <Link href={`/admin/users/${row.referredUserId}`} className="hover:underline">
                {row.referredEmail}
              </Link>
            </td>
            <td className="px-4 py-3">
              <StatusPill status={row.accountStatus} />
            </td>
            <td className="px-4 py-3 text-[var(--sp-muted)]">
              {new Date(row.referredAt).toISOString().slice(0, 10)}
            </td>
            <td className="px-4 py-3 text-right">
              <RowLink href={`/admin/users/${row.referredUserId}`}>Open</RowLink>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
