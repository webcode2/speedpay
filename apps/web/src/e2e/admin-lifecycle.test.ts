import { beforeAll, describe, expect, it } from "vitest";
import { listAuditLogs } from "@/services/admin-audit-service";
import { loginAdmin } from "@/services/admin-auth-service";
import { listAdminInvestments } from "@/services/admin-investments-service";
import {
  activatePackage,
  createPackage,
  getPackage,
} from "@/services/admin-package-service";
import { createProject, transitionProject } from "@/services/admin-project-service";
import {
  getReportsSummary,
  parseReportRange,
} from "@/services/admin-reports-service";
import { listAdminWithdrawals } from "@/services/admin-withdrawal-service";
import {
  isDatabaseAvailable,
  seedAdminCreds,
} from "./helpers";

const describeE2E = await isDatabaseAvailable() ? describe : describe.skip;

describeE2E("E2E admin lifecycle", () => {
  let adminId: string;

  beforeAll(async () => {
    const session = await loginAdmin(seedAdminCreds());
    adminId = session.admin.id;
    expect(session.admin.permissions.length).toBeGreaterThan(0);
  }, 60_000);

  it(
    "creates project/package, opens inventory, and reads ops surfaces",
    async () => {
      const project = await createProject(adminId, {
        name: `Admin E2E Project ${Date.now()}`,
        description: "Admin lifecycle",
        location: "Abuja",
        capacity: "1MW",
      });
      expect(project.status).toBe("DRAFT");

      await transitionProject(adminId, project.id, "publish");

      const pkg = await createPackage(adminId, {
        projectId: project.id,
        name: `Admin E2E Package ${Date.now()}`,
        lotPrice: "2500",
        totalLots: 20,
        minimumLots: 1,
        maximumLots: 5,
        returnType: "FIXED_RETURN",
        returnRate: "12",
        durationDays: 90,
        bannerImage: "packages/banners/e2e-admin.jpg",
      });
      expect(pkg.status).toBe("DRAFT");

      const opened = await activatePackage(adminId, pkg.id);
      expect(["OPEN", "FULL"]).toContain(opened.status);

      const fetched = await getPackage(adminId, pkg.id);
      expect(fetched.id).toBe(pkg.id);
      expect(fetched.currentVersionId).toBeTruthy();

      const investments = await listAdminInvestments({
        adminId,
        limit: 10,
      });
      expect(investments).toHaveProperty("items");

      const withdrawals = await listAdminWithdrawals({ adminId });
      expect(Array.isArray(withdrawals)).toBe(true);

      const summary = await getReportsSummary(adminId, parseReportRange());
      expect(summary).toBeTruthy();

      const audit = await listAuditLogs({
        adminId,
        limit: 20,
      });
      expect(audit.items.length).toBeGreaterThan(0);
      expect(
        audit.items.some(
          (row) =>
            row.entityType === "project" ||
            row.entityType === "investment_package" ||
            row.action === "PROJECT_CREATED" ||
            row.action === "PACKAGE_CREATED" ||
            row.action === "PACKAGE_ACTIVATED",
        ),
      ).toBe(true);
    },
    90_000,
  );
});
