"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Detail = {
  id: string;
  userEmail: string;
  userStatus: string;
  amount: number;
  currency: string;
  status: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  rejectionReason: string | null;
};

export default function AdminWithdrawalDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/withdrawals/${params.id}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setDetail(json.data.withdrawal);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function act(path: string, body?: { reason: string }) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/withdrawals/${params.id}/${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Action failed");
      return;
    }
    setMessage(`Marked ${path}`);
    await load();
  }

  if (!detail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <p className="text-slate-400">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <Link className="text-sm text-emerald-400" href="/admin/withdrawals">
        ← Queue
      </Link>
      <h1 className="text-3xl font-semibold">Withdrawal review</h1>
      <p className="text-slate-400">
        {detail.userEmail} ({detail.userStatus}) · {detail.status}
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Amount</dt>
          <dd className="text-lg font-semibold">
            {detail.amount} {detail.currency}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Bank</dt>
          <dd>{detail.bankName}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Account</dt>
          <dd>
            {detail.accountName} · {detail.accountNumber}
          </dd>
        </div>
      </dl>
      {detail.rejectionReason ? (
        <p className="text-amber-300">Reason: {detail.rejectionReason}</p>
      ) : null}
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      <textarea
        className="min-h-24 rounded border border-slate-600 bg-slate-900 px-3 py-2"
        placeholder="Rejection reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        {detail.status === "PENDING" ? (
          <>
            <button
              type="button"
              className="rounded bg-emerald-600 px-4 py-2"
              onClick={() => void act("approve")}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded bg-red-700 px-4 py-2"
              onClick={() => void act("reject", { reason })}
            >
              Reject
            </button>
          </>
        ) : null}
        {detail.status === "APPROVED" ? (
          <button
            type="button"
            className="rounded bg-emerald-600 px-4 py-2"
            onClick={() => void act("process")}
          >
            Process (mock bank)
          </button>
        ) : null}
      </div>
    </main>
  );
}
