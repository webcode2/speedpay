import { describe, expect, it } from "vitest";
import {
  assertProjectTransition,
  PROJECT_TRANSITIONS,
} from "./admin-project-service";
import { AppError } from "@/lib/app-error";

describe("project transitions", () => {
  it("allows publish from DRAFT", () => {
    expect(assertProjectTransition("publish", "DRAFT").to).toBe("ACTIVE");
  });

  it("rejects publish from ACTIVE", () => {
    expect(() => assertProjectTransition("publish", "ACTIVE")).toThrow(AppError);
  });

  it("defines all lifecycle actions", () => {
    expect(Object.keys(PROJECT_TRANSITIONS).sort()).toEqual([
      "archive",
      "complete",
      "pause",
      "publish",
      "resume",
    ]);
  });
});
