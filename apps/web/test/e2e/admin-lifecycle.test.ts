import { beforeAll, describe, expect, it } from "vitest";
import { listAuditLogs } from "@/services/admin-audit-service";
import { loginAdmin } from "@/services/admin-auth-service";
import { listAdminInvestments } from "@/services/admin-investments-service";
import {
  activatePlan,
  createPlan,
  getPlan,
} from "@/services/admin-plan-service";
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
    "creates a plan, opens it, and reads admin surfaces",
    async () => {
      const pkg = await createPlan(adminId, {
        name: `Admin E2E Plan ${Date.now()}`,
        kind: "ROI",
        price: 2500,
        durationDays: 30,
        dailyRoi: 100,
        dailyTaskLimit: 1,
        taskReward: 0,
      });
      expect(pkg.status).toBe("DRAFT");

      const opened = await activatePlan(adminId, pkg.id);
      expect(opened.status).toBe("OPEN");

      const fetched = await getPlan(adminId, pkg.id);
      expect(fetched.id).toBe(pkg.id);
      expect(fetched.price).toBe(2500);
      expect(fetched.dailyRoi).toBe(100);

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
            row.entityType === "investment_plan" ||
            row.action === "PROJECT_CREATED" ||
            row.action === "PLAN_CREATED" ||
            row.action === "PLAN_ACTIVATED",
        ),
      ).toBe(true);
    },
    90_000,
  );
});
