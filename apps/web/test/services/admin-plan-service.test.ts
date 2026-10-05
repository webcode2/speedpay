import { describe, expect, it } from "vitest";
import { validatePlanInput } from "@/services/admin-plan-service";

const base = {
  name: "speed 1",
  price: 18000,
  termRoi: 400,
  durationDays: 21,
  dailyTaskLimit: 2,
  taskReward: 375,
};

describe("validatePlanInput", () => {
  it("accepts a plan with term ROI, duration, and review pay", () => {
    expect(() => validatePlanInput(base)).not.toThrow();
  });

  it("requires a name", () => {
    expect(() => validatePlanInput({ ...base, name: "  " })).toThrow(/Name/);
  });

  it("requires every plan to include at least one daily task", () => {
    expect(() => validatePlanInput({ ...base, dailyTaskLimit: 0 })).toThrow(
      /dailyTaskLimit/,
    );
  });

  it("requires the admin to set a term of at least one day", () => {
    expect(() => validatePlanInput({ ...base, durationDays: 0 })).toThrow(
      /durationDays/,
    );
  });

  it("requires a positive price", () => {
    expect(() => validatePlanInput({ ...base, price: 0 })).toThrow(/price/);
  });
});
