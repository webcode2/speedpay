"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../_components/investor-page";

type Withdrawal = {
  id: string;
  status: string;
  amount: number;
  createdAt: string;
};

type Payout = { id: string; bankName: string; accountNumber: string; isDefault?: boolean };

export default function WithdrawalsPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [hasPin, setHasPin] = useState(false);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [payoutAccountId, setPayoutAccountId] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [w, p, pinRes] = await Promise.all([
      fetch("/api/withdrawals").then((r) => r.json()),
      fetch("/api/payout-accounts").then((r) => r.json()),
      fetch("/api/withdrawal-pin").then((r) => r.json()),
    ]);
    if (!w.success) {
      setError(w.error?.message ?? "Failed to load withdrawals");
      return;
    }
    setItems(w.data.items);
    if (p.success) {
      const list = p.data.items as Payout[];
      setPayouts(list);
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def) setPayoutAccountId(def.id);
    }
    if (pinRes.success) setHasPin(Boolean(pinRes.data.hasPin));
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSetPin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/withdrawal-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: newPin }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "PIN failed");
      return;
    }
    setMessage("Withdrawal PIN set.");
    setNewPin("");
    await load();
  }

  async function onWithdraw(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const idempotencyKey = `web-wd-${Date.now()}`;
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount: Number(amount),
        payoutAccountId,
        pin,
        idempotencyKey,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Withdrawal failed");
      return;
    }
    setMessage("Withdrawal requested.");
    setAmount("");
    setPin("");
    await load();
  }

  async function onCancel(id: string) {
    const res = await fetch(`/api/withdrawals/${id}/cancel`, { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Cancel failed");
      return;
    }
    await load();
  }

  return (
    <InvestorPage title="Withdrawals">
      {!hasPin ? (
        <form onSubmit={onSetPin} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Set withdrawal PIN
            <input
              type="password"
              className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="rounded bg-slate-700 px-4 py-2 text-sm">
            Save PIN
          </button>
        </form>
      ) : (
        <form onSubmit={onWithdraw} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Amount
            <input
              className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            PIN
            <input
              type="password"
              className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Payout account
            <select
              className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
              value={payoutAccountId}
              onChange={(e) => setPayoutAccountId(e.target.value)}
            >
              {payouts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bankName} · {a.accountNumber}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 sm:col-span-2"
          >
            Request withdrawal
          </button>
        </form>
      )}
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((w) => (
          <li
            key={w.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <span>
              {formatAmount(w.amount)} · {w.status} ·{" "}
              {new Date(w.createdAt).toLocaleString()}
            </span>
            {w.status === "PENDING" ? (
              <button
                type="button"
                className="text-amber-300"
                onClick={() => void onCancel(w.id)}
              >
                Cancel
              </button>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? (
          <li className="px-4 py-3 text-slate-500">No withdrawals yet.</li>
        ) : null}
      </ul>
    </InvestorPage>
  );
}
