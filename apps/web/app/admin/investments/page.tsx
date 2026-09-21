"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  status: string;
  principal: number;
  lotCount: number;
  userEmail: string;
  packageName: string;
  projectName: string;
  startAt: string;
  maturityAt: string;
};

export default function AdminInvestmentsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");

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
    setTotal(json.data.total);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const packageCards = useMemo(() => {
    const map = new Map<
      string,
      {
        packageName: string;
        projectName: string;
        subscribers: Item[];
        principal: number;
      }
    >();
    for (const row of items) {
      const key = `${row.packageName}::${row.projectName}`;
      const cur = map.get(key) ?? {
        packageName: row.packageName,
        projectName: row.projectName,
        subscribers: [],
        principal: 0,
      };
      cur.subscribers.push(row);
      cur.principal += Number(row.principal) || 0;
      map.set(key, cur);
    }
    return [...map.values()];
  }, [items]);

  return (
    <div className="w-full">
      <AdminPageHeader
        title="Investments"
        subtitle={`${total} positions`}
        actions={
          <>
            <AdminSelect
              value={status}
              onChange={(v) => {
                setStatus(v);
                void load(v);
              }}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="MATURED">MATURED</option>
              <option value="REINVESTED">REINVESTED</option>
              <option value="COMPLETED">COMPLETED</option>
            </AdminSelect>
            <div className="flex rounded-xl bg-[var(--sp-surface)] p-1 ring-1 ring-[var(--sp-border)]">
              {(["cards", "table"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
                    view === mode
                      ? "bg-[var(--sp-navy)] text-white"
                      : "text-[var(--sp-muted)]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </>
        }
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}

      {view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {packageCards.map((pkg) => (
            <AdminCard key={`${pkg.packageName}-${pkg.projectName}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--sp-navy)]">
                    {pkg.packageName}
                  </h2>
                  <p className="text-sm text-[var(--sp-muted)]">
                    {pkg.projectName} · {pkg.subscribers.length} subscriber
                    {pkg.subscribers.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--sp-lime-mint)] px-3 py-2 text-right">
                  <p className="text-[11px] text-[var(--sp-lime-deep)]">
                    Total principal
                  </p>
                  <p className="font-bold text-[var(--sp-navy)]">
                    {formatAmount(pkg.principal)}
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {pkg.subscribers.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--sp-border)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/investments/${s.id}`}
                        className="truncate font-medium text-[var(--sp-navy)] hover:text-[var(--sp-lime-deep)]"
                      >
                        {s.userEmail}
                      </Link>
                      <p className="text-xs text-[var(--sp-muted)]">
                        {formatAmount(s.principal)} · {s.lotCount} lots
                      </p>
                    </div>
                    <StatusPill status={s.status} />
                  </li>
                ))}
              </ul>
            </AdminCard>
          ))}
          {packageCards.length === 0 ? (
            <p className="text-sm text-[var(--sp-muted)]">No investments.</p>
          ) : null}
        </div>
      ) : (
        <AdminTable
          columns={[
            "Investor",
            "Package",
            "Principal",
            "Lots",
            "Status",
            "",
          ]}
          empty={items.length === 0 ? "No investments." : undefined}
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
              <td className="px-4 py-3">{item.lotCount}</td>
              <td className="px-4 py-3">
                <StatusPill status={item.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <RowLink href={`/admin/investments/${item.id}`}>Open</RowLink>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
