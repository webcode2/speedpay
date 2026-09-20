"use client";

import Link from "next/link";
import { InvestorPage } from "../_components/investor-page";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/verification", label: "Verification / KYC" },
  { href: "/payout-accounts", label: "Payout accounts" },
  { href: "/security", label: "Security (password & sessions)" },
  { href: "/withdrawals", label: "Withdrawal PIN" },
  { href: "/onboarding", label: "Onboarding checklist" },
  { href: "/notifications", label: "Notifications" },
] as const;

export default function SettingsPage() {
  return (
    <InvestorPage title="Settings">
      <p className="text-slate-400">
        Account preferences and security shortcuts. Platform defaults are managed
        by staff.
      </p>
      <ul className="divide-y divide-slate-800 rounded border border-slate-800">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              className="block px-4 py-3 text-emerald-400 hover:bg-slate-900"
              href={link.href}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </InvestorPage>
  );
}
