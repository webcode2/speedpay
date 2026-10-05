import { beforeAll, describe, expect, it } from "vitest";
import { getAdminDashboard } from "@/services/admin-dashboard-service";
import { listAdminReferrals } from "@/services/admin-referrals-service";
import { loginAdmin } from "@/services/admin-auth-service";
import { activatePlan, createPlan } from "@/services/admin-plan-service";
import { registerUser } from "@/services/auth-service";
import { createDeposit, verifyDeposit } from "@/services/deposit-service";
import { createPaymentAccount, publishPaymentAccount } from "@/services/platform-payment-account-service";
import { purchasePlan } from "@/services/purchase-service";
import { getTeam } from "@/services/team-service";
import { getWallet, listWalletTransactions } from "@/services/wallet-service";
import { approveKyc } from "@/services/admin-kyc-service";
import { updateProfile } from "@/services/profile-service";
import {
  getVerificationForUser,
  submitVerification,
  uploadVerificationDocument,
} from "@/services/verification-service";
import {
  E2E_PASSWORD,
  isDatabaseAvailable,
  seedAdminCreds,
  tinyPng,
  uniqueEmail,
} from "./helpers";

const describeE2E = (await isDatabaseAvailable()) ? describe : describe.skip;

describeE2E("E2E referrals", () => {
  let adminId: string;

  beforeAll(async () => {
    const admin = await loginAdmin(seedAdminCreds());
    adminId = admin.admin.id;
  }, 60_000);

  it("links a referred account to the inviter", async () => {
    const referrer = await registerUser({
      email: uniqueEmail("ref"),
      password: E2E_PASSWORD,
    });
    expect(referrer.user.referralCode).toMatch(/^[0-9A-F]{8}$/);

    await expect(
      registerUser({
        email: uniqueEmail("badcode"),
        password: E2E_PASSWORD,
        inviteCode: "NOPECODE",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const referred = await registerUser({
      email: uniqueEmail("down"),
      password: E2E_PASSWORD,
      inviteCode: referrer.user.referralCode,
    });
    expect(referred.user.referredByUserId).toBe(referrer.user.id);

    const team = await getTeam(referrer.user.id);
    expect(team.referringStatus).toBe("GROWING");
    expect(team.overview.directReferrals).toBe(1);
    expect(team.levels.A).toBe(1);
    expect(team.members.some((m) => m.email === referred.user.email)).toBe(true);

    const list = await listAdminReferrals({ adminId, limit: 100 });
    expect(
      list.items.some(
        (row) =>
          row.referrerUserId === referrer.user.id &&
          row.referredUserId === referred.user.id,
      ),
    ).toBe(true);

    const dash = await getAdminDashboard(adminId);
    expect(dash.referrals.referredAccounts).toBeGreaterThan(0);
    expect(dash.referrals.referrers).toBeGreaterThan(0);
  }, 90_000);

  it("distributes 3-tier referral commissions on investment purchase", async () => {
    // 1. Setup 3-tier chain: User A -> User B -> User C
    const userA = await registerUser({
      email: uniqueEmail("tier-a"),
      password: E2E_PASSWORD,
    });

    const userB = await registerUser({
      email: uniqueEmail("tier-b"),
      password: E2E_PASSWORD,
      inviteCode: userA.user.referralCode,
    });

    const userC = await registerUser({
      email: uniqueEmail("tier-c"),
      password: E2E_PASSWORD,
      inviteCode: userB.user.referralCode,
    });

    expect(userB.user.referredByUserId).toBe(userA.user.id);
    expect(userC.user.referredByUserId).toBe(userB.user.id);

    // 2. Setup active investment plan & payment account
    const pmt = await createPaymentAccount(adminId, {
      type: "BANK",
      label: "Ref Test Bank",
      accountName: "Ref Test Corp",
      accountNumber: "9988776655",
      bankName: "Ref Test Bank",
    });
    await publishPaymentAccount(adminId, pmt.id);

    const planPrice = 100_000;
    const plan = await createPlan(adminId, {
      name: `Referral Plan ${Date.now()}`,
      kind: "ROI",
      price: planPrice,
      durationDays: 30,
      dailyRoi: 5000,
      dailyTaskLimit: 5,
      taskReward: 500,
    });
    await activatePlan(adminId, plan.id);

    // 3. Complete KYC for User C
    await updateProfile(userC.user.id, {
      firstName: "Ref",
      lastName: "Investor",
      dateOfBirth: "1995-05-20",
      country: "NG",
    });
    await uploadVerificationDocument({
      userId: userC.user.id,
      documentType: "ID_FRONT",
      fileName: "id.png",
      contentType: "image/png",
      bytes: tinyPng,
    });
    await uploadVerificationDocument({
      userId: userC.user.id,
      documentType: "SELFIE",
      fileName: "selfie.png",
      contentType: "image/png",
      bytes: tinyPng,
    });
    await submitVerification(userC.user.id);
    const vReq = await getVerificationForUser(userC.user.id);
    if (vReq.request) {
      await approveKyc(adminId, vReq.request.id);
    }

    // 4. Fund User C's wallet
    const { deposit } = await createDeposit({
      userId: userC.user.id,
      paymentAccountId: pmt.id,
      amount: planPrice,
      senderTransactionId: `TX-REFC-${Date.now()}`,
    });
    await verifyDeposit(userC.user.id, deposit.id);

    // 5. User C purchases the plan
    await purchasePlan({
      userId: userC.user.id,
      planId: plan.id,
    });

    // 5. Verify User B received 10% (Level A commission) = 10,000
    const walletB = await getWallet(userB.user.id);
    expect(walletB.availableBalance).toBe(10_000);
    const txsB = await listWalletTransactions(userB.user.id);
    expect(txsB.some((t) => t.type === "COMMISSION" && t.amount === 10_000)).toBe(true);

    // 6. Verify User A received 2% (Level B commission) = 2,000
    const walletA = await getWallet(userA.user.id);
    expect(walletA.availableBalance).toBe(2_000);
    const txsA = await listWalletTransactions(userA.user.id);
    expect(txsA.some((t) => t.type === "COMMISSION" && t.amount === 2_000)).toBe(true);

    // 7. Verify Team structure for User A (Level A: 1, Level B: 1)
    const teamA = await getTeam(userA.user.id);
    expect(teamA.levels.A).toBe(1);
    expect(teamA.levels.B).toBe(1);
    expect(teamA.levels.C).toBe(0);
    expect(teamA.overview.totalMembers).toBe(2);
  }, 120_000);
});
