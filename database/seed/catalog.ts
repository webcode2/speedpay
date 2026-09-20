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
  { code: "projects.create", name: "Create projects" },
  { code: "projects.update", name: "Update projects" },
  { code: "projects.publish", name: "Publish projects" },
  { code: "packages.create", name: "Create packages" },
  { code: "packages.update", name: "Update packages" },
  { code: "packages.activate", name: "Activate packages" },
  { code: "packages.pause", name: "Pause packages" },
  { code: "investments.read", name: "Read investments" },
  { code: "investments.update", name: "Update investments" },
  { code: "deposits.read", name: "Read deposits" },
  { code: "withdrawals.read", name: "Read withdrawals" },
  { code: "withdrawals.approve", name: "Approve withdrawals" },
  { code: "withdrawals.reject", name: "Reject withdrawals" },
  { code: "withdrawals.process", name: "Process withdrawals" },
  { code: "returns.read", name: "Read returns" },
  { code: "returns.calculate", name: "Calculate returns" },
  { code: "maturities.read", name: "Read maturities" },
  { code: "maturities.process", name: "Process maturities" },
  { code: "staff.create", name: "Create staff" },
  { code: "staff.update", name: "Update staff" },
  { code: "roles.read", name: "Read roles" },
  { code: "roles.update", name: "Update roles" },
  { code: "audit.read", name: "Read audit logs" },
  { code: "reports.read", name: "Read reports" },
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
    description: "Withdrawals, returns, and maturities",
  },
  {
    code: "INVESTMENT_MANAGER",
    name: "Investment Manager",
    description: "Projects, packages, and investments",
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
    "returns.read",
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
    "withdrawals.read",
    "withdrawals.approve",
    "withdrawals.reject",
    "withdrawals.process",
    "returns.read",
    "returns.calculate",
    "maturities.read",
    "maturities.process",
  ],
  INVESTMENT_MANAGER: [
    "projects.create",
    "projects.update",
    "projects.publish",
    "packages.create",
    "packages.update",
    "packages.activate",
    "packages.pause",
    "investments.read",
    "investments.update",
  ],
  KYC_OFFICER: ["kyc.read", "kyc.approve", "kyc.reject"],
};
