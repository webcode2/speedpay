import { describe, expect, it } from "vitest";
import {
  formatPaymentInstructions,
  pickRandomPublishedAccount,
} from "./platform-payment-account-service";

const bank = {
  id: "1",
  type: "BANK",
  label: "Main",
  accountName: "SPEED PAY LTD",
  accountNumber: "0123456789",
  bankName: "Demo Bank",
  provider: null as string | null,
  notes: "Use your email as narration",
  status: "PUBLISHED",
};

const momo = {
  ...bank,
  id: "2",
  type: "MOBILE_MONEY",
  bankName: null,
  provider: "MTN",
  accountNumber: "08012345678",
};

describe("pickRandomPublishedAccount", () => {
  it("returns null when empty", () => {
    expect(pickRandomPublishedAccount([])).toBeNull();
  });

  it("returns the only published account", () => {
    expect(pickRandomPublishedAccount([bank], () => 0)).toEqual(bank);
  });

  it("uses random index among accounts", () => {
    expect(pickRandomPublishedAccount([bank, momo], () => 0.99)).toEqual(momo);
  });
});

describe("formatPaymentInstructions", () => {
  it("includes bank fields", () => {
    const s = formatPaymentInstructions(bank);
    expect(s).toContain("Demo Bank");
    expect(s).toContain("0123456789");
    expect(s).toContain("SPEED PAY LTD");
  });
});
