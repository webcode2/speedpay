"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Detail = {
  id: string;
  userEmail: string;
  packageName: string;
  projectName: string;
  status: string;
  principal: number;
  accruedReturn: number;
  currentValue: number;
  expectedReturn: number;
  maturityValue: number;
  priorMaterialized: number;
  deltaAccrued: number;
  eligible: boolean;
  history: { id: string; deltaAccrued: number; asOf: string; createdAt: string }[];
};

export default function AdminReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/returns/${params.id}`);
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

  async function materialize() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const key =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `mat-${Date.now()}`;
    const res = await fetch(`/api/admin/returns/${params.id}/materialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: key }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.success) {
      setError(json.error?.message ?? "Materialize failed");
      return;
    }
    setMessage(
      json.data.replayed
        ? "Idempotent replay — existing accrual returned"
        : `Materialized delta ${json.data.accrual.deltaAccrued}`,
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
      <Link className="text-sm text-emerald-400" href="/admin/returns">
        ← Queue
      </Link>
      <h1 className="text-3xl font-semibold">Materialize return</h1>
      <p className="text-slate-400">
        {detail.userEmail} · {detail.packageName} · {detail.status}
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Principal</dt>
          <dd>{detail.principal}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Accrued (now)</dt>
          <dd>{detail.accruedReturn}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Already materialized</dt>
          <dd>{detail.priorMaterialized}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Delta to credit (PENDING)</dt>
          <dd className="text-lg font-semibold">{detail.deltaAccrued}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Current / maturity value</dt>
          <dd>
            {detail.currentValue} / {detail.maturityValue}
          </dd>
        </div>
      </dl>
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      <button
        type="button"
        disabled={busy || !detail.eligible}
        className="w-fit rounded bg-emerald-600 px-4 py-2 disabled:opacity-40"
        onClick={() => void materialize()}
      >
        Confirm materialize
      </button>
      <h2 className="mt-4 text-xl font-semibold">History</h2>
      <ul className="divide-y divide-slate-800 rounded border border-slate-800 text-sm">
        {(detail.history ?? []).length === 0 ? (
          <li className="px-4 py-3 text-slate-400">No prior accruals.</li>
        ) : null}
        {(detail.history ?? []).map((h) => (
          <li key={h.id} className="px-4 py-3">
            delta {h.deltaAccrued} · as of {h.asOf}
          </li>
        ))}
      </ul>
    </main>
  );
}
