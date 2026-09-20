import { relations } from "drizzle-orm";
import { adminRoles } from "./admin-roles";
import { adminSessions } from "./admin-sessions";
import { admins } from "./admins";
import { permissions } from "./permissions";
import { payoutAccounts } from "./payout-accounts";
import { projectDocuments } from "./project-documents";
import { projects } from "./projects";
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
