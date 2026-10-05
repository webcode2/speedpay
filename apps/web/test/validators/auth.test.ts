import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/validators/auth";

describe("auth validators", () => {
  it("accepts a valid register payload", () => {
    const result = registerSchema.safeParse({
      email: "  User@Example.com ",
      password: "ChangeMeNow!123",
      phone: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("accepts an optional invite code", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "ChangeMeNow!123",
      inviteCode: " ab12cd34 ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inviteCode).toBe("ab12cd34");
    }
  });

  it("rejects short passwords on register", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts login credentials", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "x",
    });
    expect(result.success).toBe(true);
  });

  it("requires reset token and long password", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "abc",
        password: "ChangeMeNow!123",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        token: "",
        password: "ChangeMeNow!123",
      }).success,
    ).toBe(false);
  });
});
