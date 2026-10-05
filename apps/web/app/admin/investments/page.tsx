"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
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
  userId: string;
  status: string;
  principal: number;
  userEmail: string;
  planName: string;
  planKind: string;
  dailyRoi: number;
  termRoi?: number;
  taskReward?: number;
  dailyTaskLimit: number;
  tasksCompletedToday: number;
  tasksRemainingToday: number;
  tasksLifetime: number;
  startAt: string;
  maturityAt: string;
};

type Totals = {
  subscriptions: number;
  uniqueUsers: number;
  active: number;
};

export default function AdminSubscribersPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load(next = status) {
    const params = new URLSearchParams({ limit: "100" });
    if (next) params.set("status", next);
    const res = await fetch(`/api/admin/investments?${params}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setItems(json.data.items);
    setTotals(json.data.totals ?? null);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Subscribers"
        subtitle="Active user subscriptions, package validity, and daily task progress"
        actions={
          <AdminSelect
            value={status}
            onChange={(value) => {
              setStatus(value);
              void load(value);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
          </AdminSelect>
        }
      />
      {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}

      <AdminCard className="!p-0 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[var(--sp-border)]">
          {[
            {
              title: "Subscriptions",
              value: totals?.subscriptions ?? items.length,
              note: "All package purchases",
            },
            {
              title: "People",
              value: totals?.uniqueUsers ?? 0,
              note: "Unique subscribers",
            },
            {
              title: "Active now",
              value: totals?.active ?? 0,
              note: "Active task earners",
            },
          ].map((card) => (
            <div key={card.title} className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sp-muted)]">
                {card.title}
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--sp-navy)]">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-[var(--sp-muted)]">{card.note}</p>
            </div>
          ))}
        </div>
      </AdminCard>

      <div>
        <h2 className="mb-3 text-base font-bold text-[var(--sp-navy)]">
          Each subscriber
        </h2>
        <AdminTable
          columns={[
            "User",
            "Package",
            "Validity",
            "Tasks today",
            "Balance",
            "Lifetime",
            "Status",
            "",
          ]}
          empty={items.length === 0 ? "No subscribers yet." : undefined}
        >
          {items.map((row) => (
            <tr key={row.id} className="hover:bg-[var(--sp-surface)]/70">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/users/${row.userId}`}
                  className="font-medium text-[var(--sp-navy)] hover:underline"
                >
                  {row.userEmail}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-[var(--sp-navy)]">
                  {row.planName}
                </div>
                <div className="text-xs text-[var(--sp-muted)]">
                  ₦{formatAmount(row.principal)}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-[var(--sp-navy)]">
                  Expires {new Date(row.maturityAt).toISOString().slice(0, 10)}
                </div>
                <div className="text-xs text-[var(--sp-muted)]">
                  Started {new Date(row.startAt).toISOString().slice(0, 10)}
                </div>
              </td>
              <td className="px-4 py-3">
                {row.tasksCompletedToday}/{row.dailyTaskLimit}
                {row.taskReward
                  ? ` · ₦${formatAmount(row.taskReward)}/task`
                  : ""}
              </td>
              <td className="px-4 py-3">{row.tasksRemainingToday} left</td>
              <td className="px-4 py-3">{row.tasksLifetime}</td>
              <td className="px-4 py-3">
                <StatusPill status={row.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <RowLink href={`/admin/users/${row.userId}`}>Open</RowLink>
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}
