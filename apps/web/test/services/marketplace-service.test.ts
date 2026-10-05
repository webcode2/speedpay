import { describe, expect, it } from "vitest";
import { publicPlanView } from "@/services/marketplace-service";

describe("publicPlanView", () => {
  it("maps price, automatic ROI, and extra review pay", () => {
    const view = publicPlanView({
      id: "p1",
      name: "120k",
      description: null,
      bannerImage: null,
      kind: "ROI",
      price: 120000,
      dailyRoi: 4000,
      sortOrder: 2,
      status: "OPEN",
      slotPrice: "120000",
      totalSlots: 1,
      reservedSlots: 0,
      soldSlots: 0,
      minimumSlots: 1,
      maximumSlots: 1,
      returnType: "DAILY_ROI",
      returnRate: "0",
      durationDays: 28,
      dailyTaskLimit: 2,
      taskReward: 375,
      availableFrom: null,
      availableUntil: null,
      currentVersionId: null,
      createdAt: new Date("2026-09-28T00:00:00.000Z"),
      updatedAt: new Date("2026-09-28T00:00:00.000Z"),
    });
    expect(view).toMatchObject({
      price: 120000,
      termRoi: 4000,
      durationDays: 28,
      durationLabel: "4 weeks",
      perOrder: 375,
      dailyTasks: 2,
      dailyProfit: 750,
      dailyTaskProfit: 750,
      maturityPayout: 124000,
    });
  });
});
