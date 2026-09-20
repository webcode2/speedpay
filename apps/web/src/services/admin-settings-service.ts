import type { AuditMeta } from "@/audit/write-admin-audit";
import { writeAdminAudit } from "@/audit/write-admin-audit";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { requireAdminPermission } from "@/permissions/check";
import {
  listSettings,
  updateSettingsValues,
} from "@/settings/settings";

export async function getAdminSettings(adminId: string) {
  await requireAdminPermission(adminId, "settings.read");
  return { items: await listSettings() };
}

export async function patchAdminSettings(
  adminId: string,
  updates: Record<string, string>,
  meta: AuditMeta = {},
) {
  await requireAdminPermission(adminId, "settings.update");
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new AppError("VALIDATION_ERROR", "updates object is required.", 400);
  }
  const before = await listSettings();
  const beforeMap = Object.fromEntries(before.map((s) => [s.key, s.value]));
  const changed = await updateSettingsValues(updates);
  if (changed.length === 0) {
    throw new AppError(
      "VALIDATION_ERROR",
      "No valid setting keys provided.",
      400,
    );
  }

  await writeAdminAudit(getDb(), {
    actorId: adminId,
    action: "SETTINGS_UPDATED",
    entityType: "system_settings",
    entityId: "platform",
    before: Object.fromEntries(
      changed.map((c) => [c.key, beforeMap[c.key] ?? null]),
    ),
    after: Object.fromEntries(changed.map((c) => [c.key, c.value])),
    meta,
  });

  return { items: await listSettings(), updated: changed };
}
