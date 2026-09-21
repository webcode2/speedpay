export const ADMIN_NAV_LINKS = [
  {
    href: "/admin",
    label: "Dashboard",
    group: "main",
    permissions: [
      "users.read",
      "investments.read",
      "kyc.read",
      "deposits.read",
      "withdrawals.read",
      "returns.read",
    ],
  },
  { href: "/admin/users", label: "Users", group: "main", permissions: ["users.read"] },
  { href: "/admin/kyc", label: "KYC", group: "main", permissions: ["kyc.read"] },
  { href: "/admin/payouts", label: "Payouts", group: "main", permissions: ["payouts.read"] },
  {
    href: "/admin/projects",
    label: "Projects",
    group: "ops",
    permissions: ["projects.create", "projects.update", "projects.publish"],
  },
  {
    href: "/admin/packages",
    label: "Packages",
    group: "ops",
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
    group: "ops",
    permissions: ["investments.read"],
  },
  { href: "/admin/deposits", label: "Deposits", group: "ops", permissions: ["deposits.read"] },
  {
    href: "/admin/payment-accounts",
    label: "Payment accounts",
    group: "ops",
    permissions: ["payment_accounts.read"],
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    group: "ops",
    permissions: ["withdrawals.read"],
  },
  { href: "/admin/returns", label: "Returns", group: "ops", permissions: ["returns.read"] },
  {
    href: "/admin/maturities",
    label: "Maturities",
    group: "ops",
    permissions: ["maturities.read"],
  },
  {
    href: "/admin/reinvestments",
    label: "Reinvestments",
    group: "ops",
    permissions: ["investments.read"],
  },
  {
    href: "/admin/reports",
    label: "Reports",
    group: "ops",
    permissions: ["reports.read"],
  },
  {
    href: "/admin/staff",
    label: "Staff",
    group: "account",
    permissions: ["staff.create", "staff.update"],
  },
  {
    href: "/admin/roles",
    label: "Roles",
    group: "account",
    permissions: ["roles.read"],
  },
  { href: "/admin/audit", label: "Audit", group: "account", permissions: ["audit.read"] },
  {
    href: "/admin/settings",
    label: "Settings",
    group: "account",
    permissions: ["settings.read"],
  },
] as const;

/** @deprecated Sidebar replaced top nav; keep export for existing imports. */
export function AdminNav() {
  return null;
}
