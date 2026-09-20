import { relations } from "drizzle-orm";
import { adminRoles } from "./admin-roles";
import { adminSessions } from "./admin-sessions";
import { admins } from "./admins";
import { permissions } from "./permissions";
import { payoutAccounts } from "./payout-accounts";
import { projectDocuments } from "./project-documents";
import { projects } from "./projects";
import { investmentPackages } from "./investment-packages";
import { packageVersions } from "./package-versions";
import { ledgerAccounts } from "./ledger-accounts";
import { ledgerEntries } from "./ledger-entries";
import { walletTransactions } from "./wallet-transactions";
import { wallets } from "./wallets";
import { deposits } from "./deposits";
import { investments } from "./investments";
import { investmentLots } from "./investment-lots";
import { investmentAccruals } from "./investment-accruals";
import { withdrawalPins } from "./withdrawal-pins";
import { withdrawals } from "./withdrawals";
import { maturities } from "./maturities";
import { reinvestments } from "./reinvestments";
import { notificationTemplates } from "./notification-templates";
import { notifications } from "./notifications";
import { rolePermissions } from "./role-permissions";
import { roles } from "./roles";
import { userProfiles } from "./user-profiles";
import { userSessions } from "./user-sessions";
import { users } from "./users";
import { verificationDocuments } from "./verification-documents";
import { verificationRequests } from "./verification-requests";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(userSessions),
  verificationRequests: many(verificationRequests),
  payoutAccounts: many(payoutAccounts),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  deposits: many(deposits),
  investments: many(investments),
  withdrawals: many(withdrawals),
  withdrawalPin: one(withdrawalPins, {
    fields: [users.id],
    references: [withdrawalPins.userId],
  }),
  notifications: many(notifications),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const adminsRelations = relations(admins, ({ many }) => ({
  adminRoles: many(adminRoles),
  sessions: many(adminSessions),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  admin: one(admins, {
    fields: [adminSessions.adminId],
    references: [admins.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  adminRoles: many(adminRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const adminRolesRelations = relations(adminRoles, ({ one }) => ({
  admin: one(admins, {
    fields: [adminRoles.adminId],
    references: [admins.id],
  }),
  role: one(roles, {
    fields: [adminRoles.roleId],
    references: [roles.id],
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const verificationRequestsRelations = relations(
  verificationRequests,
  ({ one, many }) => ({
    user: one(users, {
      fields: [verificationRequests.userId],
      references: [users.id],
    }),
    reviewer: one(admins, {
      fields: [verificationRequests.reviewedBy],
      references: [admins.id],
    }),
    documents: many(verificationDocuments),
  }),
);

export const verificationDocumentsRelations = relations(
  verificationDocuments,
  ({ one }) => ({
    request: one(verificationRequests, {
      fields: [verificationDocuments.verificationRequestId],
      references: [verificationRequests.id],
    }),
  }),
);

export const payoutAccountsRelations = relations(payoutAccounts, ({ one }) => ({
  user: one(users, {
    fields: [payoutAccounts.userId],
    references: [users.id],
  }),
  reviewer: one(admins, {
    fields: [payoutAccounts.reviewedBy],
    references: [admins.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  documents: many(projectDocuments),
  packages: many(investmentPackages),
}));

export const projectDocumentsRelations = relations(
  projectDocuments,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectDocuments.projectId],
      references: [projects.id],
    }),
  }),
);

export const investmentPackagesRelations = relations(
  investmentPackages,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [investmentPackages.projectId],
      references: [projects.id],
    }),
    versions: many(packageVersions),
    investments: many(investments),
    investmentLots: many(investmentLots),
  }),
);

export const packageVersionsRelations = relations(packageVersions, ({ one }) => ({
  package: one(investmentPackages, {
    fields: [packageVersions.packageId],
    references: [investmentPackages.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  accounts: many(ledgerAccounts),
  transactions: many(walletTransactions),
}));

export const ledgerAccountsRelations = relations(
  ledgerAccounts,
  ({ one, many }) => ({
    wallet: one(wallets, {
      fields: [ledgerAccounts.walletId],
      references: [wallets.id],
    }),
    entries: many(ledgerEntries),
  }),
);

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  account: one(ledgerAccounts, {
    fields: [ledgerEntries.ledgerAccountId],
    references: [ledgerAccounts.id],
  }),
}));

export const walletTransactionsRelations = relations(
  walletTransactions,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [walletTransactions.walletId],
      references: [wallets.id],
    }),
  }),
);

export const depositsRelations = relations(deposits, ({ one }) => ({
  user: one(users, {
    fields: [deposits.userId],
    references: [users.id],
  }),
  walletTransaction: one(walletTransactions, {
    fields: [deposits.walletTransactionId],
    references: [walletTransactions.id],
  }),
}));

export const investmentsRelations = relations(investments, ({ one, many }) => ({
  user: one(users, {
    fields: [investments.userId],
    references: [users.id],
  }),
  package: one(investmentPackages, {
    fields: [investments.packageId],
    references: [investmentPackages.id],
  }),
  packageVersion: one(packageVersions, {
    fields: [investments.packageVersionId],
    references: [packageVersions.id],
  }),
  lots: many(investmentLots),
  accruals: many(investmentAccruals),
  maturity: one(maturities, {
    fields: [investments.id],
    references: [maturities.investmentId],
  }),
  parent: one(investments, {
    fields: [investments.parentInvestmentId],
    references: [investments.id],
    relationName: "investmentParent",
  }),
  children: many(investments, { relationName: "investmentParent" }),
  reinvestmentsAsParent: many(reinvestments, {
    relationName: "reinvestmentParent",
  }),
}));

export const investmentLotsRelations = relations(investmentLots, ({ one }) => ({
  investment: one(investments, {
    fields: [investmentLots.investmentId],
    references: [investments.id],
  }),
  package: one(investmentPackages, {
    fields: [investmentLots.packageId],
    references: [investmentPackages.id],
  }),
}));

export const investmentAccrualsRelations = relations(
  investmentAccruals,
  ({ one }) => ({
    investment: one(investments, {
      fields: [investmentAccruals.investmentId],
      references: [investments.id],
    }),
    user: one(users, {
      fields: [investmentAccruals.userId],
      references: [users.id],
    }),
    createdByAdmin: one(admins, {
      fields: [investmentAccruals.createdBy],
      references: [admins.id],
    }),
    walletTransaction: one(walletTransactions, {
      fields: [investmentAccruals.walletTransactionId],
      references: [walletTransactions.id],
    }),
  }),
);

export const withdrawalPinsRelations = relations(withdrawalPins, ({ one }) => ({
  user: one(users, {
    fields: [withdrawalPins.userId],
    references: [users.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, {
    fields: [withdrawals.userId],
    references: [users.id],
  }),
  payoutAccount: one(payoutAccounts, {
    fields: [withdrawals.payoutAccountId],
    references: [payoutAccounts.id],
  }),
  walletTransaction: one(walletTransactions, {
    fields: [withdrawals.walletTransactionId],
    references: [walletTransactions.id],
  }),
  reviewedByAdmin: one(admins, {
    fields: [withdrawals.reviewedBy],
    references: [admins.id],
    relationName: "withdrawalReviewedBy",
  }),
  processedByAdmin: one(admins, {
    fields: [withdrawals.processedBy],
    references: [admins.id],
    relationName: "withdrawalProcessedBy",
  }),
}));

export const maturitiesRelations = relations(maturities, ({ one }) => ({
  investment: one(investments, {
    fields: [maturities.investmentId],
    references: [investments.id],
  }),
  user: one(users, {
    fields: [maturities.userId],
    references: [users.id],
  }),
  processedByAdmin: one(admins, {
    fields: [maturities.processedBy],
    references: [admins.id],
  }),
}));

export const reinvestmentsRelations = relations(reinvestments, ({ one }) => ({
  parent: one(investments, {
    fields: [reinvestments.parentInvestmentId],
    references: [investments.id],
    relationName: "reinvestmentParent",
  }),
  newInvestment: one(investments, {
    fields: [reinvestments.newInvestmentId],
    references: [investments.id],
    relationName: "reinvestmentChild",
  }),
  user: one(users, {
    fields: [reinvestments.userId],
    references: [users.id],
  }),
}));

export const notificationTemplatesRelations = relations(
  notificationTemplates,
  () => ({}),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
