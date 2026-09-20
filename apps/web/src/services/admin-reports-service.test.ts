import { describe, expect, it } from "vitest";
import { parseReportRange, rowsToCsv } from "./admin-reports-service";

describe("rowsToCsv", () => {
  it("escapes commas and quotes", () => {
    expect(
      rowsToCsv([
        { id: "1", name: 'a, "b"' },
        { id: "2", name: "plain" },
      ]),
    ).toBe('id,name\n1,"a, ""b"""\n2,plain');
  });

  it("returns empty string for no rows", () => {
    expect(rowsToCsv([])).toBe("");
  });
});

describe("parseReportRange", () => {
  it("parses ISO dates", () => {
    const range = parseReportRange("2026-01-01", "2026-12-31T23:59:59Z");
    expect(range.from?.toISOString()).toContain("2026-01-01");
    expect(range.to?.getUTCFullYear()).toBe(2026);
  });
});
