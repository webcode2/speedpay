import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../seed/hash";

describe("password hash", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("ChangeMeNow!123");
    expect(hash).not.toContain("ChangeMeNow!123");
    await expect(verifyPassword(hash, "ChangeMeNow!123")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong")).resolves.toBe(false);
  });
});
