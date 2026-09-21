"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Detail = {
  id: string;
  userEmail: string;
  packageName: string;
  status: string;
  principal: number;
  expectedReturn: number;
  maturityValue: number;
  priorAccrued: number;
  availableCredited: number;
  pendingDebited: number;
  maturityAt: string;
  eligible: boolean;
  blockReason: string | null;
};

export default function AdminMaturityDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/maturities/${params.id}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setDetail(json.data.investment);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function process() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const key =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `mat-${Date.now()}`;
    const res = await fetch(`/api/admin/maturities/${params.id}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: key }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.success) {
      setError(json.error?.message ?? "Process failed");
      return;
    }
    setMessage(
      json.data.replayed
        ? "Idempotent replay"
        : `Processed — credited ${json.data.maturity.availableCredited}`,
    );
    await load();
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
      <Link className="text-sm text-emerald-400" href="/admin/maturities">
        ← Queue
      </Link>
      <h1 className="text-3xl font-semibold">Process maturity</h1>
      <p className="text-slate-400">
        {detail.userEmail} · {detail.packageName} · {detail.status}
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Principal</dt>
          <dd>{detail.principal}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Expected return</dt>
          <dd>{detail.expectedReturn}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Maturity value → AVAILABLE</dt>
          <dd className="text-lg font-semibold">{detail.availableCredited}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Settle PENDING accruals</dt>
          <dd>{detail.pendingDebited}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Due</dt>
          <dd>{detail.maturityAt}</dd>
        </div>
      </dl>
      {detail.blockReason ? (
        <p className="text-amber-300">Blocked: {detail.blockReason}</p>
      ) : null}
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      <button
        type="button"
        disabled={busy || !detail.eligible}
        className="w-fit rounded bg-emerald-600 px-4 py-2 disabled:opacity-40"
        onClick={() => void process()}
      >
        Confirm process maturity
      </button>
    </main>
  );
}
