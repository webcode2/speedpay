"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const INVESTOR_NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/packages", label: "Packages" },
  { href: "/investments", label: "Investments" },
  { href: "/returns", label: "Returns" },
  { href: "/wallet", label: "Wallet" },
  { href: "/deposits", label: "Deposits" },
  { href: "/withdrawals", label: "Withdrawals" },
  { href: "/maturity", label: "Maturity" },
  { href: "/reinvest", label: "Reinvest" },
  { href: "/notifications", label: "Notifications" },
  { href: "/profile", label: "Profile" },
  { href: "/security", label: "Security" },
  { href: "/settings", label: "Settings" },
] as const;

export function InvestorNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {INVESTOR_NAV_LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "text-white" : "text-emerald-400"}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
