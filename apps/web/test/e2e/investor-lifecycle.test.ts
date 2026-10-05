import { beforeAll, describe, expect, it } from "vitest";
import { loginAdmin } from "@/services/admin-auth-service";
import { approveKyc } from "@/services/admin-kyc-service";
import {
  activatePlan,
  createPlan,
} from "@/services/admin-plan-service";
import { approvePayout } from "@/services/admin-payout-service";
import {
  approveWithdrawal,
  processWithdrawal,
} from "@/services/admin-withdrawal-service";
import { registerUser } from "@/services/auth-service";
import { createDeposit, verifyDeposit } from "@/services/deposit-service";
import { createPayoutAccount } from "@/services/payout-account-service";
import {
  createPaymentAccount,
  publishPaymentAccount,
} from "@/services/platform-payment-account-service";
import { listInvestments } from "@/services/portfolio-service";
import { updateProfile } from "@/services/profile-service";
import { purchasePlan } from "@/services/purchase-service";
import {
  submitVerification,
  uploadVerificationDocument,
  getVerificationForUser,
} from "@/services/verification-service";
import { getWallet } from "@/services/wallet-service";
import { setWithdrawalPin } from "@/services/withdrawal-pin-service";
import { createWithdrawal, listWithdrawals } from "@/services/withdrawal-service";
import {
  E2E_PASSWORD,
  isDatabaseAvailable,
  seedAdminCreds,
  tinyPng,
  uniqueEmail,
} from "./helpers";

const describeE2E = await isDatabaseAvailable() ? describe : describe.skip;

describeE2E("E2E investor lifecycle", () => {
  let adminId: string;
  let userId: string;
  let planId: string;
  let investmentId: string;
  let payoutAccountId: string;

  beforeAll(async () => {
    const admin = await loginAdmin(seedAdminCreds());
    adminId = admin.admin.id;
  }, 60_000);

  it(
    "runs register → invest → mature → withdraw",
    async () => {
      const email = uniqueEmail("investor");
      const registered = await registerUser({
        email,
        password: E2E_PASSWORD,
      });
      userId = registered.user.id;
      expect(userId).toBeTruthy();

      await updateProfile(userId, {
        firstName: "E2E",
        lastName: "Investor",
        dateOfBirth: "1990-01-15",
        country: "NG",
      });

      await uploadVerificationDocument({
        userId,
        documentType: "ID_FRONT",
        fileName: "id.png",
        contentType: "image/png",
        bytes: tinyPng,
      });
      await uploadVerificationDocument({
        userId,
        documentType: "SELFIE",
        fileName: "selfie.png",
        contentType: "image/png",
        bytes: tinyPng,
      });
      await submitVerification(userId);
      const verification = await getVerificationForUser(userId);
      expect(verification.request?.id).toBeTruthy();

      await approveKyc(adminId, verification.request!.id);
      const payout = await createPayoutAccount(userId, {
        bankName: "E2E Bank",
        accountNumber: "0123456789",
        accountName: "E2E Investor",
      });
      payoutAccountId = payout.id;
      await approvePayout(adminId, payoutAccountId);

      const pkg = await createPlan(adminId, {
        name: `E2E Plan ${Date.now()}`,
        kind: "ROI",
        price: 1000,
        durationDays: 30,
        dailyRoi: 10,
        dailyTaskLimit: 1,
        taskReward: 0,
      });
      planId = pkg.id;
      await activatePlan(adminId, planId);

      const payAcct = await createPaymentAccount(adminId, {
        type: "BANK",
        label: `E2E Bank ${Date.now()}`,
        accountName: "SPEED PAY E2E",
        accountNumber: "999000111",
        bankName: "E2E Bank",
      });
      await publishPaymentAccount(adminId, payAcct.id);

      const { deposit } = await createDeposit(userId, 5000);
      const verified = await verifyDeposit(userId, deposit.id);
      expect(verified.credited || verified.alreadyComplete).toBeTruthy();

      const walletBefore = await getWallet(userId);
      expect(walletBefore.availableBalance).toBeGreaterThanOrEqual(1000);

      const idempotencyKey = `e2e-purchase-${userId}-${Date.now()}`;
      const purchase = await purchasePlan({
        userId,
        planId,
        idempotencyKey,
      });
      expect(purchase.replayed).toBe(false);
      investmentId = purchase.investment.id;

      const replay = await purchasePlan({
        userId,
        planId,
        idempotencyKey,
      });
      expect(replay.replayed).toBe(true);
      expect(replay.investment.id).toBe(investmentId);

      const portfolio = await listInvestments(userId);
      expect(portfolio.some((i) => i.id === investmentId)).toBe(true);

      await setWithdrawalPin(userId, "4242");
      const walletAfter = await getWallet(userId);
      const withdrawAmount = Math.min(500, walletAfter.availableBalance);
      expect(withdrawAmount).toBeGreaterThan(0);

      const withdrawal = await createWithdrawal({
        userId,
        amount: withdrawAmount,
        payoutAccountId,
        pin: "4242",
        idempotencyKey: `e2e-wd-${userId}`,
      });
      expect(withdrawal.withdrawal.id).toBeTruthy();

      await approveWithdrawal(adminId, withdrawal.withdrawal.id);
      await processWithdrawal(adminId, withdrawal.withdrawal.id);

      const withdrawals = await listWithdrawals(userId);
      expect(
        withdrawals.some(
          (w) => w.id === withdrawal.withdrawal.id && w.status === "COMPLETED",
        ),
      ).toBe(true);
    },
    120_000,
  );
});
