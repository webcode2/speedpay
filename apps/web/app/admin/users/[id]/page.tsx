"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { hasAnyPermission } from "@/permissions/visibility";
import { useAdminPermissions } from "../../_components/admin-shell";
import {
  AdminCard,
  AdminPageHeader,
  AdminTable,
  StatusPill,
} from "../../_components/ui";

type Investment = {
  id: string;
  planName: string;
  planKind: string;
  status: string;
  principal: number;
  dailyRoi: number;
  termRoi?: number;
  taskReward?: number;
  dailyTaskLimit: number;
  startAt: string;
  maturityAt: string;
};

type Tasks = {
  eligible: boolean;
  dailyLimit: number;
  completedToday: number;
  remainingToday: number;
  earnedToday: number;
  lifetime: number;
  lifetimeEarned: number;
};

type Detail = {
  id: string;
  email: string;
  status: string;
  investmentCount: number;
  payoutAccountCount: number;
  latestKyc: { id: string; status: string } | null;
  profile: { firstName: string | null; lastName: string | null } | null;
  investments: Investment[];
  tasks: Tasks;
  referralCode?: string;
  referringStatus?: string;
  referredBy?: { id: string; email: string } | null;
  referrals?: {
    id: string;
    email: string;
    accountStatus: string;
    createdAt: string;
  }[];
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const permissions = useAdminPermissions();
  const canDisable = hasAnyPermission(permissions, ["users.disable"]);
  const canEnable = hasAnyPermission(permissions, ["users.update"]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/users/${params.id}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setDetail(json.data.user);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function setStatus(action: "disable" | "enable") {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Update failed");
        return;
      }
      setMessage(action === "disable" ? "User suspended" : "User enabled");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <div className="flex w-full items-center">
        <p className="text-[var(--sp-muted)]">{error ?? "Loading…"}</p>
      </div>
    );
  }

  const name = [detail.profile?.firstName, detail.profile?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title={detail.email}
        subtitle={name || "Investor"}
        actions={
          <div className="flex gap-2">
            {canDisable &&
            detail.status !== "SUSPENDED" &&
            detail.status !== "CLOSED" ? (
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-red-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void setStatus("disable")}
              >
                Suspend
              </button>
            ) : null}
            {canEnable && detail.status === "SUSPENDED" ? (
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-[var(--sp-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void setStatus("enable")}
              >
                Enable
              </button>
            ) : null}
          </div>
        }
      />
      {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
      {message ? <p className="text-[var(--sp-lime-deep)]">{message}</p> : null}

      <AdminCard className="!p-0 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--sp-border)] md:grid-cols-4 md:divide-y-0">
          {[
            { title: "Status", value: detail.status },
            { title: "Plans", value: String(detail.investmentCount) },
            {
              title: "Tasks today",
              value: `${detail.tasks.completedToday}/${detail.tasks.dailyLimit}`,
            },
            {
              title: "Task balance",
              value: `${detail.tasks.remainingToday} left`,
            },
          ].map((card) => (
            <div key={card.title} className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sp-muted)]">
                {card.title}
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--sp-navy)]">
                {card.value}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--sp-border)] px-5 py-3 text-sm text-[var(--sp-muted)]">
          Lifetime reviews: {detail.tasks.lifetime} · Earned ₦
          {formatAmount(detail.tasks.lifetimeEarned)}
          {detail.latestKyc ? (
            <>
              {" "}
              · KYC{" "}
              <Link
                className="font-semibold text-[var(--sp-navy)] hover:underline"
                href={`/admin/kyc/${detail.latestKyc.id}`}
              >
                {detail.latestKyc.status}
              </Link>
            </>
          ) : null}
        </div>
      </AdminCard>

      <div>
        <h2 className="mb-3 text-base font-bold text-[var(--sp-navy)]">
          Subscriptions
        </h2>
        <AdminTable
          columns={["Plan", "Principal", "ROI at end", "Matures", "Tasks/day", "Status"]}
          empty={
            detail.investments.length === 0
              ? "This investor has not subscribed yet."
              : undefined
          }
        >
          {detail.investments.map((inv) => (
            <tr key={inv.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-[var(--sp-navy)]">
                  {inv.planName}
                </div>
              </td>
              <td className="px-4 py-3">₦{formatAmount(inv.principal)}</td>
              <td className="px-4 py-3">₦{formatAmount(inv.termRoi ?? inv.dailyRoi)}</td>
              <td className="px-4 py-3">
                {new Date(inv.maturityAt).toISOString().slice(0, 10)}
              </td>
              <td className="px-4 py-3">{inv.dailyTaskLimit}/day</td>
              <td className="px-4 py-3">
                <StatusPill status={inv.status} />
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <div>
        <h2 className="mb-3 text-base font-bold text-[var(--sp-navy)]">
          Referrals
        </h2>
        <p className="mb-3 text-sm text-[var(--sp-muted)]">
          Code {detail.referralCode ?? "—"} · Referring status{" "}
          {detail.referringStatus ?? "NONE"}
          {detail.referredBy ? (
            <>
              {" "}
              · Invited by{" "}
              <Link
                className="font-semibold text-[var(--sp-navy)] hover:underline"
                href={`/admin/users/${detail.referredBy.id}`}
              >
                {detail.referredBy.email}
              </Link>
            </>
          ) : null}
        </p>
        <AdminTable
          columns={["Account", "Status"]}
          empty={
            (detail.referrals ?? []).length === 0
              ? "This investor has not referred anyone yet."
              : undefined
          }
        >
          {(detail.referrals ?? []).map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/users/${row.id}`}
                  className="font-medium text-[var(--sp-navy)] hover:underline"
                >
                  {row.email}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusPill status={row.accountStatus} />
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}
