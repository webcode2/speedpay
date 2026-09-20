"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InvestorPage } from "../_components/investor-page";

export default function OnboardingPage() {
  const [profileOk, setProfileOk] = useState(false);
  const [kycStatus, setKycStatus] = useState("…");
  const [payoutCount, setPayoutCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [profile, verification, payouts] = await Promise.all([
        fetch("/api/profile").then((r) => r.json()),
        fetch("/api/verification").then((r) => r.json()),
        fetch("/api/payout-accounts").then((r) => r.json()),
      ]);
      if (!profile.success || !verification.success || !payouts.success) {
        setError("Failed to load onboarding status");
        return;
      }
      setProfileOk(Boolean(profile.data.complete ?? profile.data.isComplete));
      setKycStatus(verification.data.status ?? "NOT_STARTED");
      setPayoutCount((payouts.data.items as unknown[])?.length ?? 0);
    })();
  }, []);

  const kycOk = kycStatus === "APPROVED" || kycStatus === "KYC_APPROVED";

  return (
    <InvestorPage title="Onboarding">
      {error ? <p className="text-red-400">{error}</p> : null}
      <ol className="space-y-3 text-sm">
        <li className="rounded border border-slate-800 px-4 py-3">
          <div className="flex justify-between gap-3">
            <span>1. Complete profile {profileOk ? "✓" : ""}</span>
            <Link className="text-emerald-400" href="/profile">
              Open
            </Link>
          </div>
        </li>
        <li className="rounded border border-slate-800 px-4 py-3">
          <div className="flex justify-between gap-3">
            <span>
              2. Verify identity ({kycStatus}) {kycOk ? "✓" : ""}
            </span>
            <Link className="text-emerald-400" href="/verification">
              Open
            </Link>
          </div>
        </li>
        <li className="rounded border border-slate-800 px-4 py-3">
          <div className="flex justify-between gap-3">
            <span>
              3. Add payout account ({payoutCount}) {payoutCount > 0 ? "✓" : ""}
            </span>
            <Link className="text-emerald-400" href="/payout-accounts">
              Open
            </Link>
          </div>
        </li>
      </ol>
      {profileOk && kycOk && payoutCount > 0 ? (
        <Link
          href="/dashboard"
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950"
        >
          Go to dashboard
        </Link>
      ) : null}
    </InvestorPage>
  );
}
