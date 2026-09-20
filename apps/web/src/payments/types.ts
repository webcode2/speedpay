export type PaymentInitializeInput = {
  amount: number;
  currency: string;
  reference: string;
  metadata?: Record<string, string>;
};

export type PaymentInitializeResult = {
  providerRef: string;
  paymentUrl: string | null;
  instructions: string;
};

export type PaymentVerifyResult = {
  status: "SUCCESS" | "FAILED" | "PENDING";
  providerRef: string;
  amount: number;
  currency: string;
  raw?: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  initialize(input: PaymentInitializeInput): Promise<PaymentInitializeResult>;
  verify(providerRef: string): Promise<PaymentVerifyResult>;
  refund?(providerRef: string, amount: number): Promise<{ status: string }>;
}
