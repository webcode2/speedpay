import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashToken } from "./tokens";

describe("tokens", () => {
  it("generates unique opaque tokens", () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes deterministically with sha256 hex", () => {
    const h1 = hashToken("abc");
    const h2 = hashToken("abc");
    expect(h1).toEqual(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h1).not.toEqual("abc");
  });
});
