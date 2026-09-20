import { MockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./types";

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  const driver = (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();
  if (driver === "mock") {
    cached = new MockPaymentProvider();
    return cached;
  }
  throw new Error(`Unsupported PAYMENT_PROVIDER=${driver}`);
}
