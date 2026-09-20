import { relations } from "drizzle-orm";
import { adminRoles } from "./admin-roles";
import { admins } from "./admins";
import { permissions } from "./permissions";
import { rolePermissions } from "./role-permissions";
import { roles } from "./roles";
import { userProfiles } from "./user-profiles";
import { userSessions } from "./user-sessions";
import { users } from "./users";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(userSessions),
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
