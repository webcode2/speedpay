import { relations } from "drizzle-orm";
import { adminRoles } from "./admin-roles";
import { adminSessions } from "./admin-sessions";
import { admins } from "./admins";
import { permissions } from "./permissions";
import { payoutAccounts } from "./payout-accounts";
import { platformPaymentAccounts } from "./platform-payment-accounts";
import { investmentPlans } from "./investment-plans";
import { ledgerAccounts } from "./ledger-accounts";
import { ledgerEntries } from "./ledger-entries";
import { walletTransactions } from "./wallet-transactions";
import { wallets } from "./wallets";
import { deposits } from "./deposits";
import { investments } from "./investments";
import { withdrawalPins } from "./withdrawal-pins";
import { withdrawals } from "./withdrawals";
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

export const investmentPlansRelations = relations(
  investmentPlans,
  ({ many }) => ({
    investments: many(investments),
  }),
);

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
  paymentAccount: one(platformPaymentAccounts, {
    fields: [deposits.paymentAccountId],
    references: [platformPaymentAccounts.id],
  }),
  approvedByAdmin: one(admins, {
    fields: [deposits.approvedByAdminId],
    references: [admins.id],
  }),
}));

export const investmentsRelations = relations(investments, ({ one, many }) => ({
  user: one(users, {
    fields: [investments.userId],
    references: [users.id],
  }),
  plan: one(investmentPlans, {
    fields: [investments.planId],
    references: [investmentPlans.id],
  }),
  parent: one(investments, {
    fields: [investments.parentInvestmentId],
    references: [investments.id],
    relationName: "investmentParent",
  }),
  children: many(investments, { relationName: "investmentParent" }),
}));

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
