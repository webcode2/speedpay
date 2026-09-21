"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { hasAnyPermission } from "@/permissions/visibility";
import { AdminNav } from "../../_components/admin-nav";
import { useAdminPermissions } from "../../_components/admin-shell";

type Detail = {
  id: string;
  email: string;
  status: string;
  investmentCount: number;
  payoutAccountCount: number;
  latestKyc: { id: string; status: string } | null;
  profile: { firstName: string | null; lastName: string | null } | null;
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
      <main className="flex w-full items-center">
        <p className="text-slate-400">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col gap-4">
      <Link className="text-sm text-emerald-400" href="/admin/users">
        ← Users
      </Link>
      <AdminNav />
      <h1 className="text-3xl font-semibold">{detail.email}</h1>
      <p className="text-slate-400">Status: {detail.status}</p>
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      <div className="flex gap-2">
        {canDisable && detail.status !== "SUSPENDED" && detail.status !== "CLOSED" ? (
          <button
            type="button"
            disabled={busy}
            className="rounded bg-red-800 px-3 py-2 text-sm"
            onClick={() => void setStatus("disable")}
          >
            Suspend
          </button>
        ) : null}
        {canEnable && detail.status === "SUSPENDED" ? (
          <button
            type="button"
            disabled={busy}
            className="rounded bg-emerald-700 px-3 py-2 text-sm"
            onClick={() => void setStatus("enable")}
          >
            Enable
          </button>
        ) : null}
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Name</dt>
          <dd>
            {detail.profile?.firstName ?? "—"} {detail.profile?.lastName ?? ""}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Investments</dt>
          <dd>{detail.investmentCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Payout accounts</dt>
          <dd>{detail.payoutAccountCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Latest KYC</dt>
          <dd>
            {detail.latestKyc ? (
              <Link
                className="text-emerald-400"
                href={`/admin/kyc/${detail.latestKyc.id}`}
              >
                {detail.latestKyc.status}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </main>
  );
}
