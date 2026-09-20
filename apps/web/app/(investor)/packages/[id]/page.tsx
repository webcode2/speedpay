"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../../_components/investor-page";

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  projectName: string;
  lotPrice: string;
  returnRate: string;
  durationDays: number;
  availableLots: number;
  minimumLots: number;
  maximumLots: number | null;
};

type Quote = {
  principal: number;
  expectedReturn: number;
  maturityValue: number;
  maturityAt: string;
  lotCount: number;
};

export default function PackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [lots, setLots] = useState("1");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/marketplace/packages/${id}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      const p = json.data.package as Pkg;
      setPkg(p);
      setLots(String(p.minimumLots ?? 1));
    })();
  }, [id]);

  async function onQuote(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setQuote(null);
    const lotCount = Number(lots);
    const res = await fetch(`/api/marketplace/packages/${id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lotCount }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Quote failed");
      return;
    }
    setQuote(json.data.quote);
  }

  async function onPurchase() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const lotCount = Number(lots);
    const idempotencyKey = `web-purchase-${id}-${lotCount}-${Date.now()}`;
    const res = await fetch(`/api/marketplace/packages/${id}/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ lotCount, idempotencyKey }),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.success) {
      setError(json.error?.message ?? "Purchase failed");
      return;
    }
    const investmentId = json.data.investment?.id;
    setMessage("Purchase complete.");
    if (investmentId) {
      router.push(`/investments/${investmentId}`);
    }
  }

  return (
    <InvestorPage title={pkg?.name ?? "Package"}>
      <Link className="text-sm text-emerald-400" href="/packages">
        ← Packages
      </Link>
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      {pkg ? (
        <>
          <p className="text-slate-400">
            {pkg.projectName}
            {pkg.description ? ` — ${pkg.description}` : ""}
          </p>
          <dl className="space-y-1 text-sm">
            <div>Lot price: {formatAmount(pkg.lotPrice)}</div>
            <div>Return: {pkg.returnRate}%</div>
            <div>Duration: {pkg.durationDays} days</div>
            <div>Available lots: {pkg.availableLots}</div>
          </dl>
          <form onSubmit={onQuote} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Lots
              <input
                className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="rounded bg-slate-700 px-4 py-2 text-sm"
            >
              Get quote
            </button>
          </form>
          {quote ? (
            <div className="rounded border border-slate-800 px-4 py-3 text-sm">
              <p>Principal: {formatAmount(quote.principal)}</p>
              <p>Expected return: {formatAmount(quote.expectedReturn)}</p>
              <p>Maturity value: {formatAmount(quote.maturityValue)}</p>
              <p>Matures: {new Date(quote.maturityAt).toLocaleString()}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onPurchase()}
                className="mt-3 rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-50"
              >
                {busy ? "Purchasing…" : "Purchase"}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-slate-400">Loading…</p>
      )}
    </InvestorPage>
  );
}
