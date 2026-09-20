"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../_components/investor-page";

type Deposit = {
  id: string;
  status: string;
  amount: number;
  currency?: string;
  createdAt: string;
};

export default function DepositsPage() {
  const [items, setItems] = useState<Deposit[]>([]);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/deposits");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    setItems(json.data.items);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const value = Number(amount);
    const res = await fetch("/api/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Deposit failed");
      return;
    }
    const payment = json.data.payment;
    setMessage(
      payment?.instructions ??
        payment?.paymentUrl ??
        "Deposit created. Complete payment then verify.",
    );
    setAmount("");
    const id = json.data.deposit?.id;
    if (id) {
      await fetch(`/api/deposits/${id}/verify`, { method: "POST" });
    }
    await load();
  }

  return (
    <InvestorPage title="Deposits">
      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Amount (minor units)
          <input
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950"
        >
          Create deposit
        </button>
      </form>
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((d) => (
          <li key={d.id} className="px-4 py-3 text-sm">
            {formatAmount(d.amount, d.currency)} · {d.status} ·{" "}
            {new Date(d.createdAt).toLocaleString()}
          </li>
        ))}
        {items.length === 0 ? (
          <li className="px-4 py-3 text-slate-500">No deposits yet.</li>
        ) : null}
      </ul>
    </InvestorPage>
  );
}
