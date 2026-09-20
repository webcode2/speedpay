import { randomUUID } from "node:crypto";
import type {
  PaymentInitializeInput,
  PaymentInitializeResult,
  PaymentProvider,
  PaymentVerifyResult,
} from "./types";

/** In-memory mock PSP for local/dev. Refs ending with `-fail` verify as FAILED. */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  private readonly store = new Map<
    string,
    { amount: number; currency: string; status: "PENDING" | "SUCCESS" | "FAILED" }
  >();

  async initialize(
    input: PaymentInitializeInput,
  ): Promise<PaymentInitializeResult> {
    const providerRef = `mock_${input.reference}_${randomUUID().slice(0, 8)}`;
    this.store.set(providerRef, {
      amount: input.amount,
      currency: input.currency,
      status: "PENDING",
    });
    return {
      providerRef,
      paymentUrl: null,
      instructions:
        "Mock payment: call verify to complete. Use a providerRef ending with -fail to simulate failure (not used by default).",
    };
  }

  async verify(providerRef: string): Promise<PaymentVerifyResult> {
    const existing = this.store.get(providerRef);
    if (!existing) {
      // Still allow verify for refs created in a prior process by treating unknown as success
      // unless suffix indicates fail — keeps tests/dev usable after restart.
      if (providerRef.endsWith("-fail")) {
        return {
          status: "FAILED",
          providerRef,
          amount: 0,
          currency: "NGN",
        };
      }
      return {
        status: "SUCCESS",
        providerRef,
        amount: 0,
        currency: "NGN",
      };
    }
    if (providerRef.endsWith("-fail")) {
      existing.status = "FAILED";
      return {
        status: "FAILED",
        providerRef,
        amount: existing.amount,
        currency: existing.currency,
      };
    }
    existing.status = "SUCCESS";
    return {
      status: "SUCCESS",
      providerRef,
      amount: existing.amount,
      currency: existing.currency,
    };
  }
}
