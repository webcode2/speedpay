"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/kyc", label: "KYC" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/investments", label: "Investments" },
  { href: "/admin/deposits", label: "Deposits" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/returns", label: "Returns" },
  { href: "/admin/maturities", label: "Maturities" },
  { href: "/admin/reinvestments", label: "Reinvestments" },
  { href: "/admin/login", label: "Login" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {LINKS.map((l) => {
        const active =
          l.href === "/admin"
            ? pathname === "/admin"
            : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={active ? "text-white" : "text-emerald-400"}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
