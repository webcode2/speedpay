import { describe, expect, it } from "vitest";
import { renderTemplate } from "./notification-service";

describe("renderTemplate", () => {
  it("replaces placeholders", () => {
    expect(
      renderTemplate("Hello {{name}}, amount {{amount}}", {
        name: "Ada",
        amount: 1000,
      }),
    ).toBe("Hello Ada, amount 1000");
  });

  it("blanks missing keys", () => {
    expect(renderTemplate("Hi {{name}}", {})).toBe("Hi ");
  });
});
