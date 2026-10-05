import { describe, expect, it } from "vitest";
import {
  remainingTasks,
  resolveTaskAllowance,
  utcTaskDate,
  validateTaskReview,
} from "@/lib/task-allowance";

describe("resolveTaskAllowance", () => {
  it("is ineligible with no active investments", () => {
    expect(resolveTaskAllowance([])).toEqual({
      eligible: false,
      dailyLimit: 0,
      rewardPerTask: 0,
      reason: "NO_ACTIVE_INVESTMENT",
    });
  });

  it("is ineligible when the best package grants zero tasks", () => {
    expect(
      resolveTaskAllowance([{ dailyTaskLimit: 0, taskReward: 500 }]),
    ).toMatchObject({ eligible: false, reason: "NO_TASKS_FOR_PACKAGE" });
  });

  it("picks the single best package without summing limits", () => {
    expect(
      resolveTaskAllowance([
        { dailyTaskLimit: 3, taskReward: 100 },
        { dailyTaskLimit: 5, taskReward: 50 },
        { dailyTaskLimit: 2, taskReward: 900 },
      ]),
    ).toEqual({ eligible: true, dailyLimit: 5, rewardPerTask: 50 });
  });

  it("breaks limit ties by higher reward", () => {
    expect(
      resolveTaskAllowance([
        { dailyTaskLimit: 5, taskReward: 50 },
        { dailyTaskLimit: 5, taskReward: 80 },
      ]),
    ).toEqual({ eligible: true, dailyLimit: 5, rewardPerTask: 80 });
  });
});

describe("remainingTasks", () => {
  it("never goes negative", () => {
    expect(remainingTasks(5, 2)).toBe(3);
    expect(remainingTasks(5, 7)).toBe(0);
  });
});

describe("utcTaskDate", () => {
  it("uses the UTC calendar day", () => {
    expect(utcTaskDate(new Date("2026-09-28T23:30:00.000-05:00"))).toBe(
      "2026-09-29",
    );
  });
});

describe("validateTaskReview", () => {
  it("accepts valid stars and a trimmed comment", () => {
    expect(
      validateTaskReview({ stars: 4, comment: "  Lovely stay, great staff  " }),
    ).toEqual({ ok: true, stars: 4, comment: "Lovely stay, great staff" });
  });

  it("rejects out-of-range or fractional stars", () => {
    expect(validateTaskReview({ stars: 0, comment: "long enough text" }).ok).toBe(false);
    expect(validateTaskReview({ stars: 6, comment: "long enough text" }).ok).toBe(false);
    expect(validateTaskReview({ stars: 3.5, comment: "long enough text" }).ok).toBe(false);
  });

  it("rejects short comments", () => {
    expect(validateTaskReview({ stars: 5, comment: " short " }).ok).toBe(false);
  });
});
