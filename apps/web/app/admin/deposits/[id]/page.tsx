"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNav } from "../../_components/admin-nav";

type Detail = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  provider: string | null;
  providerRef: string | null;
  userEmail: string;
  failureReason: string | null;
  createdAt: string;
};

export default function AdminDepositDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/deposits/${params.id}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setDetail(json.data.deposit);
    })();
  }, [params.id]);

  if (!detail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <p className="text-slate-400">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <Link className="text-sm text-emerald-400" href="/admin/deposits">
        ← Deposits
      </Link>
      <AdminNav />
      <h1 className="text-3xl font-semibold">Deposit</h1>
      <p className="text-slate-400">
        {detail.userEmail} · {detail.status}
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Amount</dt>
          <dd>
            {detail.amount} {detail.currency}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Provider</dt>
          <dd>
            {detail.provider ?? "—"} {detail.providerRef ?? ""}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Created</dt>
          <dd>{detail.createdAt}</dd>
        </div>
        {detail.failureReason ? (
          <div>
            <dt className="text-slate-500">Failure</dt>
            <dd className="text-amber-300">{detail.failureReason}</dd>
          </div>
        ) : null}
      </dl>
    </main>
  );
}
