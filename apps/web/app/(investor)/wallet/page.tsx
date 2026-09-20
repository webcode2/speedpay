"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../_components/investor-page";

export default function WalletPage() {
  const [wallet, setWallet] = useState<{
    availableBalance: number;
    pendingBalance: number;
    currency: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setWallet(json.data.wallet ?? json.data);
    })();
  }, []);

  return (
    <InvestorPage title="Wallet">
      {error ? <p className="text-red-400">{error}</p> : null}
      {wallet ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-slate-800 px-4 py-3">
            <p className="text-sm text-slate-400">Available</p>
            <p className="text-2xl font-semibold">
              {formatAmount(wallet.availableBalance, wallet.currency)}
            </p>
          </div>
          <div className="rounded border border-slate-800 px-4 py-3">
            <p className="text-sm text-slate-400">Pending</p>
            <p className="text-2xl font-semibold">
              {formatAmount(wallet.pendingBalance, wallet.currency)}
            </p>
          </div>
        </div>
      ) : (
        !error && <p className="text-slate-400">Loading…</p>
      )}
      <div className="flex flex-wrap gap-4 text-sm">
        <Link className="text-emerald-400" href="/wallet/transactions">
          Transactions
        </Link>
        <Link className="text-emerald-400" href="/deposits">
          Deposit
        </Link>
        <Link className="text-emerald-400" href="/withdrawals">
          Withdraw
        </Link>
      </div>
    </InvestorPage>
  );
}
