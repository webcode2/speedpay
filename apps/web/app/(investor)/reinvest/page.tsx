"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../_components/investor-page";

type Preview = {
  eligibleAmount?: number;
  parentInvestmentId?: string;
  packages?: { id: string; name: string; lotPrice: string }[];
};

type HistoryItem = {
  id: string;
  status?: string;
  createdAt: string;
  newInvestmentId?: string;
};

export default function ReinvestPage() {
  const [parentId, setParentId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [packageId, setPackageId] = useState("");
  const [lotCount, setLotCount] = useState("1");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadHistory() {
    const res = await fetch("/api/reinvestments");
    const json = await res.json();
    if (json.success) setHistory(json.data.items ?? []);
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function onPreview(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPreview(null);
    const res = await fetch(
      `/api/reinvestments/preview?parentInvestmentId=${encodeURIComponent(parentId)}`,
    );
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Preview failed");
      return;
    }
    const p = json.data.preview ?? json.data;
    setPreview(p);
    const pkgs = p.packages as { id: string }[] | undefined;
    if (pkgs?.[0]) setPackageId(pkgs[0].id);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const idempotencyKey = `web-reinvest-${parentId}-${Date.now()}`;
    const res = await fetch("/api/reinvestments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        parentInvestmentId: parentId,
        packageId,
        lotCount: Number(lotCount),
        idempotencyKey,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Reinvest failed");
      return;
    }
    setMessage("Reinvestment created.");
    await loadHistory();
  }

  return (
    <InvestorPage title="Reinvestment">
      <form onSubmit={onPreview} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Parent investment ID
          <input
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="rounded bg-slate-700 px-4 py-2 text-sm">
          Preview
        </button>
      </form>
      {preview ? (
        <form onSubmit={onSubmit} className="grid gap-3">
          <p className="text-sm text-slate-400">
            Eligible: {formatAmount(preview.eligibleAmount)}
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Package
            <select
              className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
            >
              {(preview.packages ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatAmount(p.lotPrice)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Lots
            <input
              className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
              value={lotCount}
              onChange={(e) => setLotCount(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="w-fit rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950"
          >
            Confirm reinvest
          </button>
        </form>
      ) : null}
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      <h2 className="text-lg font-medium">History</h2>
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {history.map((h) => (
          <li key={h.id} className="px-4 py-3 text-sm">
            {h.id} · {h.status ?? "OK"} ·{" "}
            {new Date(h.createdAt).toLocaleString()}
          </li>
        ))}
        {history.length === 0 ? (
          <li className="px-4 py-3 text-slate-500">No reinvestments yet.</li>
        ) : null}
      </ul>
    </InvestorPage>
  );
}
