import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env", () => {
  it("accepts valid environment values", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://solar:solar@localhost:5432/solar_investment");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "info");

    const { env } = await import("./env");

    expect(env.DATABASE_URL).toContain("solar_investment");
    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("rejects missing DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "info");

    await expect(import("./env")).rejects.toThrow();
  });
});
