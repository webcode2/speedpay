"use client";

import { FormEvent, useEffect, useState } from "react";
import { InvestorPage } from "../_components/investor-page";

type Account = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  isDefault: boolean;
};

export default function PayoutAccountsPage() {
  const [items, setItems] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/payout-accounts");
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

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/payout-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankName: form.get("bankName"),
        accountNumber: form.get("accountNumber"),
        accountName: form.get("accountName"),
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Create failed");
      return;
    }
    setMessage("Account submitted for review.");
    event.currentTarget.reset();
    await load();
  }

  async function setDefault(id: string) {
    const res = await fetch(`/api/payout-accounts/${id}/default`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Set default failed");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/payout-accounts/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Delete failed");
      return;
    }
    await load();
  }

  return (
    <InvestorPage title="Payout accounts">
      <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-3">
        <input
          name="bankName"
          placeholder="Bank name"
          required
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
        />
        <input
          name="accountNumber"
          placeholder="Account number"
          required
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
        />
        <input
          name="accountName"
          placeholder="Account name"
          required
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 sm:col-span-3"
        >
          Add account
        </button>
      </form>
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">
                {a.bankName} · {a.accountNumber}
                {a.isDefault ? " (default)" : ""}
              </p>
              <p className="text-slate-400">
                {a.accountName} · {a.status}
              </p>
            </div>
            <div className="flex gap-3">
              {!a.isDefault ? (
                <button
                  type="button"
                  className="text-emerald-400"
                  onClick={() => void setDefault(a.id)}
                >
                  Default
                </button>
              ) : null}
              <button
                type="button"
                className="text-amber-300"
                onClick={() => void remove(a.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="px-4 py-3 text-slate-500">No payout accounts.</li>
        ) : null}
      </ul>
    </InvestorPage>
  );
}
