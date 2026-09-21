"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Detail = {
  id: string;
  status: string;
  userEmail: string;
  rejectionReason: string | null;
  documents: { id: string; documentType: string; fileName: string }[];
};

export default function AdminKycDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/kyc/${params.id}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setDetail(json.data.request);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function act(path: string, body?: { reason: string }) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/kyc/${params.id}/${path}`, {
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
      <main className="flex w-full items-center">
        <p className="text-slate-400">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col gap-4">
      <Link className="text-sm text-emerald-400" href="/admin/kyc">
        ← Queue
      </Link>
      <h1 className="text-3xl font-semibold">KYC review</h1>
      <p className="text-slate-400">
        {detail.userEmail} · {detail.status}
      </p>
      {detail.rejectionReason ? (
        <p className="text-amber-300">Reason: {detail.rejectionReason}</p>
      ) : null}
      <ul className="space-y-2 text-sm">
        {detail.documents.map((d) => (
          <li key={d.id}>
            {d.documentType}:{" "}
            <a
              className="text-emerald-400"
              href={`/api/admin/kyc/${detail.id}/documents/${d.id}`}
              target="_blank"
              rel="noreferrer"
            >
              {d.fileName}
            </a>
          </li>
        ))}
      </ul>
      <textarea
        className="min-h-24 rounded border border-slate-600 bg-slate-900 px-3 py-2"
        placeholder="Reason for reject / request info"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded bg-emerald-500 px-4 py-2 text-slate-950"
          onClick={() => void act("approve")}
        >
          Approve
        </button>
        <button
          type="button"
          className="rounded bg-red-500 px-4 py-2 text-white"
          onClick={() => void act("reject", { reason })}
        >
          Reject
        </button>
        <button
          type="button"
          className="rounded bg-amber-500 px-4 py-2 text-slate-950"
          onClick={() => void act("request-info", { reason })}
        >
          Request info
        </button>
      </div>
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
    </main>
  );
}
