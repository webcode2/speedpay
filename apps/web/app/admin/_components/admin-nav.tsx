export const ADMIN_NAV_LINKS = [
  {
    href: "/admin",
    label: "Dashboard",
    group: "main",
    permissions: [
      "users.read",
      "kyc.read",
      "payouts.read",
      "staff.create",
      "staff.update",
      "roles.read",
      "audit.read",
      "settings.read",
    ],
  },
  {
    href: "/admin/plans",
    label: "Packages",
    group: "main",
    permissions: ["plans.create", "plans.update", "plans.activate", "plans.pause"],
  },
  {
    href: "/admin/investments",
    label: "Subscribers",
    group: "main",
    permissions: ["investments.read"],
  },
  {
    href: "/admin/tasks",
    label: "Tasks",
    group: "main",
    permissions: ["tasks.read", "tasks.write"],
  },
  { href: "/admin/users", label: "Users", group: "main", permissions: ["users.read"] },
  {
    href: "/admin/referrals",
    label: "Referrals",
    group: "main",
    permissions: ["users.read"],
  },
  { href: "/admin/kyc", label: "KYC", group: "main", permissions: ["kyc.read"] },
  {
    href: "/admin/deposits",
    label: "Deposits",
    group: "main",
    permissions: ["deposits.read"],
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    group: "main",
    permissions: ["withdrawals.read"],
  },
  { href: "/admin/payouts", label: "Payout Banks", group: "main", permissions: ["payouts.read"] },
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
