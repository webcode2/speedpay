import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { investments } from "@solar/database/schema";
import { getDb } from "@/db";
import { loginAdmin } from "@/services/admin-auth-service";
import { approveKyc } from "@/services/admin-kyc-service";
import { processMaturity } from "@/services/admin-maturity-service";
import {
  activatePackage,
  createPackage,
} from "@/services/admin-package-service";
import { approvePayout } from "@/services/admin-payout-service";
import { createProject } from "@/services/admin-project-service";
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
import { purchasePackage } from "@/services/purchase-service";
import { getReturnsSummary } from "@/services/returns-service";
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
  let packageId: string;
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

      const project = await createProject(adminId, {
        name: `E2E Project ${Date.now()}`,
        description: "Lifecycle test project",
        location: "Lagos",
      });
      const pkg = await createPackage(adminId, {
        projectId: project.id,
        name: `E2E Package ${Date.now()}`,
        lotPrice: "1000",
        totalLots: 50,
        minimumLots: 1,
        maximumLots: 10,
        returnType: "FIXED_RETURN",
        returnRate: "10",
        durationDays: 30,
        bannerImage: "packages/banners/e2e-investor.jpg",
      });
      packageId = pkg.id;
      await activatePackage(adminId, packageId);

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
      const purchase = await purchasePackage({
        userId,
        packageId,
        lotCount: 1,
        idempotencyKey,
      });
      expect(purchase.replayed).toBe(false);
      investmentId = purchase.investment.id;

      const replay = await purchasePackage({
        userId,
        packageId,
        lotCount: 1,
        idempotencyKey,
      });
      expect(replay.replayed).toBe(true);
      expect(replay.investment.id).toBe(investmentId);

      const portfolio = await listInvestments(userId);
      expect(portfolio.some((i) => i.id === investmentId)).toBe(true);

      const returns = await getReturnsSummary(userId);
      expect(returns.totals.principal).toBeGreaterThan(0);

      await getDb()
        .update(investments)
        .set({
          startAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          maturityAt: new Date(Date.now() - 60_000),
        })
        .where(eq(investments.id, investmentId));

      const maturity = await processMaturity({
        adminId,
        investmentId,
        idempotencyKey: `e2e-maturity-${investmentId}`,
      });
      expect(maturity.maturity).toBeTruthy();

      const maturityReplay = await processMaturity({
        adminId,
        investmentId,
        idempotencyKey: `e2e-maturity-${investmentId}`,
      });
      expect(maturityReplay.replayed).toBe(true);

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
          (w) => w.id === withdrawal.withdrawal.id && w.status === "PROCESSED",
        ),
      ).toBe(true);
    },
    120_000,
  );
});
