"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasAnyPermission } from "@/permissions/visibility";
import { useAdminPermissions } from "./admin-shell";

export const ADMIN_NAV_LINKS = [
  {
    href: "/admin",
    label: "Dashboard",
    permissions: [
      "users.read",
      "investments.read",
      "kyc.read",
      "deposits.read",
      "withdrawals.read",
      "returns.read",
    ],
  },
  { href: "/admin/users", label: "Users", permissions: ["users.read"] },
  { href: "/admin/kyc", label: "KYC", permissions: ["kyc.read"] },
  { href: "/admin/payouts", label: "Payouts", permissions: ["payouts.read"] },
  {
    href: "/admin/projects",
    label: "Projects",
    permissions: ["projects.create", "projects.update", "projects.publish"],
  },
  {
    href: "/admin/packages",
    label: "Packages",
    permissions: [
      "packages.create",
      "packages.update",
      "packages.activate",
      "packages.pause",
    ],
  },
  {
    href: "/admin/investments",
    label: "Investments",
    permissions: ["investments.read"],
  },
  { href: "/admin/deposits", label: "Deposits", permissions: ["deposits.read"] },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    permissions: ["withdrawals.read"],
  },
  { href: "/admin/returns", label: "Returns", permissions: ["returns.read"] },
  {
    href: "/admin/maturities",
    label: "Maturities",
    permissions: ["maturities.read"],
  },
  {
    href: "/admin/reinvestments",
    label: "Reinvestments",
    permissions: ["investments.read"],
  },
  {
    href: "/admin/staff",
    label: "Staff",
    permissions: ["staff.create", "staff.update"],
  },
  {
    href: "/admin/roles",
    label: "Roles",
    permissions: ["roles.read"],
  },
  { href: "/admin/audit", label: "Audit", permissions: ["audit.read"] },
  { href: "/admin/reports", label: "Reports", permissions: ["reports.read"] },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const permissions = useAdminPermissions();
  const links = ADMIN_NAV_LINKS.filter((l) =>
    hasAnyPermission(permissions, l.permissions),
  );

  return (
    <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {links.map((l) => {
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
