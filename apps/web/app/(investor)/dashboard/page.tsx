"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { useInvestorSession } from "../_components/investor-shell";
import { InvestorPage } from "../_components/investor-page";

export default function DashboardPage() {
  const user = useInvestorSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [currency, setCurrency] = useState("NGN");
  const [activeCount, setActiveCount] = useState(0);
  const [accrued, setAccrued] = useState(0);
  const [unread, setUnread] = useState(0);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const results = await Promise.all([
          fetch("/api/wallet").then((r) => r.json()),
          fetch("/api/investments").then((r) => r.json()),
          fetch("/api/returns").then((r) => r.json()),
          fetch("/api/notifications").then((r) => r.json()),
          fetch("/api/verification").then((r) => r.json()),
          fetch("/api/payout-accounts").then((r) => r.json()),
        ]);
        for (const json of results) {
          if (!json.success) {
            setError(json.error?.message ?? "Failed to load dashboard");
            setLoading(false);
            return;
          }
        }
        const [wallet, investments, returnsData, notifications, verification, payouts] =
          results;
        const w = wallet.data.wallet ?? wallet.data;
        const items = (investments.data.items as { status: string }[]) ?? [];
        const totals = returnsData.data.returns?.totals ?? returnsData.data.returns;
        const kyc = verification.data.status as string;
        const payoutItems = (payouts.data.items as unknown[]) ?? [];
        setAvailable(w.availableBalance ?? null);
        setPending(w.pendingBalance ?? null);
        setCurrency(w.currency ?? "NGN");
        setActiveCount(items.filter((i) => i.status === "ACTIVE").length);
        setAccrued(Number(totals?.accruedReturn ?? 0));
        setUnread(notifications.data.unreadCount ?? 0);
        const approved =
          kyc === "APPROVED" ||
          kyc === "KYC_APPROVED" ||
          user.status === "KYC_APPROVED";
        setNeedsOnboarding(!approved || payoutItems.length === 0);
        setLoading(false);
      } catch {
        setError("Failed to load dashboard");
        setLoading(false);
      }
    })();
  }, [user.status]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <InvestorPage title="Dashboard">
      <p className="text-slate-400">Signed in as {user.email}</p>
      {loading ? <p className="text-slate-400">Loading…</p> : null}
      {error ? <p className="text-red-400">{error}</p> : null}
      {!loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-sm text-slate-400">Available</p>
            <p className="text-xl font-semibold">
              {formatAmount(available, currency)}
            </p>
            <p className="text-xs text-slate-500">
              Pending {formatAmount(pending, currency)}
            </p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-sm text-slate-400">Active investments</p>
            <p className="text-xl font-semibold">{activeCount}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-sm text-slate-400">Accrued return</p>
            <p className="text-xl font-semibold">{formatAmount(accrued)}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-sm text-slate-400">Unread notifications</p>
            <p className="text-xl font-semibold">{unread}</p>
          </div>
        </div>
      ) : null}
      {needsOnboarding ? (
        <Link
          href="/onboarding"
          className="rounded border border-amber-700 bg-amber-950/40 px-4 py-3 text-amber-200"
        >
          Finish onboarding — complete KYC and add a payout account
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void logout()}
        className="w-fit rounded bg-slate-700 px-4 py-2 text-sm"
      >
        Sign out
      </button>
    </InvestorPage>
  );
}
