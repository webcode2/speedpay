import { describe, expect, it } from "vitest";
import { MockPaymentProvider } from "@/payments/mock";

describe("MockPaymentProvider", () => {
  it("initializes and verifies success", async () => {
    const p = new MockPaymentProvider();
    const init = await p.initialize({
      amount: 5000,
      currency: "NGN",
      reference: "dep-1",
    });
    const verified = await p.verify(init.providerRef);
    expect(verified.status).toBe("SUCCESS");
    expect(verified.amount).toBe(5000);
  });

  it("fails when ref ends with -fail", async () => {
    const p = new MockPaymentProvider();
    const verified = await p.verify("anything-fail");
    expect(verified.status).toBe("FAILED");
  });
});
