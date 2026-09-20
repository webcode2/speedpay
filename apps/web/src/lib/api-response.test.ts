import { describe, expect, it } from "vitest";
import { apiError, apiSuccess } from "./api-response";

describe("apiSuccess", () => {
  it("returns success envelope with data", async () => {
    const res = apiSuccess({ status: "ok" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { status: "ok" },
    });
  });
});

describe("apiError", () => {
  it("returns error envelope with default 500", async () => {
    const res = apiError("INTERNAL_ERROR", "Something went wrong.");
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong.",
      },
    });
  });

  it("allows custom status for DATABASE_UNAVAILABLE", async () => {
    const res = apiError(
      "DATABASE_UNAVAILABLE",
      "Database is unavailable.",
      503,
    );
    expect(res.status).toBe(503);
  });
});
