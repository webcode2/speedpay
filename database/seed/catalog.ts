export type PermissionDef = {
  code: string;
  name: string;
};

export type RoleDef = {
  code: string;
  name: string;
  description?: string;
};

export const PERMISSION_CATALOG: PermissionDef[] = [
  { code: "users.read", name: "Read users" },
  { code: "users.update", name: "Update users" },
  { code: "users.disable", name: "Disable users" },
  { code: "kyc.read", name: "Read KYC" },
  { code: "kyc.approve", name: "Approve KYC" },
  { code: "kyc.reject", name: "Reject KYC" },
  { code: "payouts.read", name: "Read payout accounts" },
  { code: "payouts.approve", name: "Approve payout accounts" },
  { code: "payouts.reject", name: "Reject payout accounts" },
  { code: "plans.create", name: "Create investment plans" },
  { code: "plans.update", name: "Update investment plans" },
  { code: "plans.activate", name: "Activate investment plans" },
  { code: "plans.pause", name: "Pause investment plans" },
  { code: "investments.read", name: "Read investments" },
  { code: "investments.update", name: "Update investments" },
  { code: "deposits.read", name: "Read deposits" },
  { code: "deposits.approve", name: "Approve and credit deposits" },
  { code: "deposits.reject", name: "Reject deposits" },
  { code: "withdrawals.read", name: "Read withdrawals" },
  { code: "withdrawals.approve", name: "Approve withdrawals" },
  { code: "withdrawals.reject", name: "Reject withdrawals" },
  { code: "withdrawals.process", name: "Process withdrawals" },
  { code: "staff.create", name: "Create staff" },
  { code: "staff.update", name: "Update staff" },
  { code: "roles.read", name: "Read roles" },
  { code: "roles.update", name: "Update roles" },
  { code: "audit.read", name: "Read audit logs" },
  { code: "reports.read", name: "Read reports" },
  { code: "settings.read", name: "Read system settings" },
  { code: "settings.update", name: "Update system settings" },
  {
    code: "payment_accounts.read",
    name: "Read platform payment accounts",
  },
  {
    code: "payment_accounts.write",
    name: "Manage platform payment accounts",
  },
  { code: "tasks.read", name: "Read daily tasks" },
  { code: "tasks.write", name: "Manage daily tasks" },
];

export const ALL_PERMISSION_CODES = PERMISSION_CATALOG.map((p) => p.code);

export const ROLE_CATALOG: RoleDef[] = [
  {
    code: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full platform access; bootstrap identity",
  },
  {
    code: "ADMIN",
    name: "Admin",
    description: "Full operational access",
  },
  {
    code: "CUSTOMER_SUPPORT",
    name: "Customer Support",
    description: "User and KYC read access",
  },
  {
    code: "ACCOUNTANT",
    name: "Accountant",
    description: "Read-only financial and audit access",
  },
  {
    code: "FINANCE_OFFICER",
    name: "Finance Officer",
    description: "Withdrawals and payout accounts",
  },
  {
    code: "INVESTMENT_MANAGER",
    name: "Investment Manager",
    description: "Investment plans and investments",
  },
  {
    code: "KYC_OFFICER",
    name: "KYC Officer",
    description: "KYC review and decisions",
  },
];

export const ROLE_PERMISSION_CODES: Record<string, string[]> = {
  SUPER_ADMIN: [...ALL_PERMISSION_CODES],
  ADMIN: [...ALL_PERMISSION_CODES],
  CUSTOMER_SUPPORT: ["users.read", "kyc.read"],
  ACCOUNTANT: [
    "deposits.read",
    "withdrawals.read",
    "investments.read",
    "audit.read",
    "reports.read",
  ],
  FINANCE_OFFICER: [
    "payouts.read",
    "payouts.approve",
    "payouts.reject",
    "deposits.read",
    "deposits.approve",
    "deposits.reject",
    "withdrawals.read",
    "withdrawals.approve",
    "withdrawals.reject",
    "withdrawals.process",
    "payment_accounts.read",
    "payment_accounts.write",
  ],
  INVESTMENT_MANAGER: [
    "plans.create",
    "plans.update",
    "plans.activate",
    "plans.pause",
    "investments.read",
    "investments.update",
    "tasks.read",
    "tasks.write",
  ],
  KYC_OFFICER: ["kyc.read", "kyc.approve", "kyc.reject"],
};
