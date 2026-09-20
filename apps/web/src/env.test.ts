import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env", () => {
  it("does not parse at module import time", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "info");

    await expect(import("./env")).resolves.toBeDefined();
  });

  it("accepts valid environment values via getEnv", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://solar:solar@localhost:5432/solar_investment");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "info");

    const { getEnv } = await import("./env");

    const env = getEnv();
    expect(env.DATABASE_URL).toContain("solar_investment");
    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("rejects missing DATABASE_URL when getEnv is called", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "info");

    const { getEnv } = await import("./env");

    expect(() => getEnv()).toThrow();
  });

  it("caches the parsed env across getEnv calls", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://solar:solar@localhost:5432/solar_investment");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "info");

    const { getEnv } = await import("./env");
    const first = getEnv();
    const second = getEnv();
    expect(second).toBe(first);
  });
});
