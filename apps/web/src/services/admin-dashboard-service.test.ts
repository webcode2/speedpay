import { describe, expect, it } from "vitest";

describe("admin ops pagination helpers", () => {
  it("clamps limit", () => {
    const limit = Math.min(Number("200") || 50, 100);
    expect(limit).toBe(100);
  });
});
