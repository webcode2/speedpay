"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../../_components/investor-page";

type Tx = {
  id: string;
  type: string;
  amount: number;
  balanceAfter?: number;
  createdAt: string;
  description?: string | null;
};

export default function WalletTransactionsPage() {
  const [items, setItems] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/wallet/transactions?limit=50");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setItems(json.data.items);
    })();
  }, []);

  return (
    <InvestorPage title="Transactions">
      <Link className="text-sm text-emerald-400" href="/wallet">
        ← Wallet
      </Link>
      {error ? <p className="text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {items.map((tx) => (
          <li key={tx.id} className="px-4 py-3 text-sm">
            <div className="font-medium">
              {tx.type} · {formatAmount(tx.amount)}
            </div>
            <div className="text-slate-400">
              {new Date(tx.createdAt).toLocaleString()}
              {tx.description ? ` · ${tx.description}` : ""}
            </div>
          </li>
        ))}
        {items.length === 0 && !error ? (
          <li className="px-4 py-3 text-slate-500">No transactions.</li>
        ) : null}
      </ul>
    </InvestorPage>
  );
}
