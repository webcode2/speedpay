import { beforeAll, describe, expect, it } from "vitest";
import { loginAdmin } from "@/services/admin-auth-service";
import { approveKyc } from "@/services/admin-kyc-service";
import {
  activatePlan,
  createPlan,
} from "@/services/admin-plan-service";
import {
  createTaskItem,
  deleteTaskItem,
  listTaskCompletions,
  setTaskItemStatus,
} from "@/services/admin-task-service";
import { registerUser } from "@/services/auth-service";
import { createDeposit, verifyDeposit } from "@/services/deposit-service";
import {
  createPaymentAccount,
  publishPaymentAccount,
} from "@/services/platform-payment-account-service";
import { updateProfile } from "@/services/profile-service";
import { purchasePlan } from "@/services/purchase-service";
import { completeTask, getTasksToday } from "@/services/task-service";
import {
  getVerificationForUser,
  submitVerification,
  uploadVerificationDocument,
} from "@/services/verification-service";
import { getWallet } from "@/services/wallet-service";
import {
  E2E_PASSWORD,
  isDatabaseAvailable,
  seedAdminCreds,
  tinyPng,
  uniqueEmail,
} from "./helpers";

const describeE2E = (await isDatabaseAvailable()) ? describe : describe.skip;

const review = {
  stars: 5,
  comment: "Solid 550W panel, good build quality and clear labeling.",
};

describeE2E("E2E daily review tasks", () => {
  let adminId: string;

  beforeAll(async () => {
    const admin = await loginAdmin(seedAdminCreds());
    adminId = admin.admin.id;
  }, 60_000);

  it(
    "gates on active investment, credits reward, enforces limit and duplicates",
    async () => {
      const stamp = Date.now();
      const itemIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const item = await createTaskItem(adminId, {
          title: `E2E Panel ${stamp}-${i}`,
          category: "Solar Panels",
          description: "Review this solar panel.",
          imageKey: "tasks/images/e2e.jpg",
        });
        await setTaskItemStatus(adminId, item.id, "PUBLISHED");
        itemIds.push(item.id);
      }

      const disposable = await createTaskItem(adminId, {
        title: `E2E Battery ${stamp}`,
        category: "Batteries",
        description: "Review this solar battery.",
        imageKey: "tasks/images/e2e.jpg",
      });
      const deleted = await deleteTaskItem(adminId, disposable.id);
      expect(deleted.deleted).toBe(true);

      const { user } = await registerUser({
        email: uniqueEmail("tasks"),
        password: E2E_PASSWORD,
      });
      const userId = user.id;

      const before = await getTasksToday(userId);
      expect(before.eligible).toBe(false);
      expect(before.reason).toBe("NO_ACTIVE_INVESTMENT");
      await expect(
        completeTask({ userId, taskItemId: itemIds[0]!, ...review }),
      ).rejects.toMatchObject({ code: "TASKS_NOT_ELIGIBLE" });

      await updateProfile(userId, {
        firstName: "Task",
        lastName: "Tester",
        dateOfBirth: "1990-01-15",
        country: "NG",
      });
      for (const documentType of ["ID_FRONT", "SELFIE"] as const) {
        await uploadVerificationDocument({
          userId,
          documentType,
          fileName: "doc.png",
          contentType: "image/png",
          bytes: tinyPng,
        });
      }
      await submitVerification(userId);
      const verification = await getVerificationForUser(userId);
      await approveKyc(adminId, verification.request!.id);

      const pkg = await createPlan(adminId, {
        name: `speed 1 ${stamp}`,
        kind: "ROI",
        price: 18000,
        durationDays: 21,
        dailyRoi: 0,
        dailyTaskLimit: 2,
        taskReward: 375,
      });
      await activatePlan(adminId, pkg.id);

      const payAcct = await createPaymentAccount(adminId, {
        type: "BANK",
        label: `E2E Tasks Bank ${stamp}`,
        accountName: "SPEED PAY E2E",
        accountNumber: "999000222",
        bankName: "E2E Bank",
      });
      await publishPaymentAccount(adminId, payAcct.id);
      const { deposit } = await createDeposit(userId, 18000);
      await verifyDeposit(userId, deposit.id);
      await purchasePlan({
        userId,
        planId: pkg.id,
        idempotencyKey: `e2e-tasks-${userId}`,
      });

      const today = await getTasksToday(userId);
      expect(today).toMatchObject({
        eligible: true,
        dailyLimit: 2,
        rewardPerTask: 375,
        completedToday: 0,
        remaining: 2,
      });
      expect(today.items.map((i) => i.id)).toEqual(
        expect.arrayContaining(itemIds),
      );

      const walletBefore = await getWallet(userId);
      const first = await completeTask({
        userId,
        taskItemId: itemIds[0]!,
        ...review,
      });
      expect(first).toMatchObject({ rewardEarned: 375, remaining: 1 });
      expect(first.availableBalance).toBe(walletBefore.availableBalance + 375);

      await expect(
        completeTask({ userId, taskItemId: itemIds[0]!, ...review }),
      ).rejects.toMatchObject({ code: "TASK_ALREADY_COMPLETED" });

      const second = await completeTask({
        userId,
        taskItemId: itemIds[1]!,
        ...review,
      });
      expect(second).toMatchObject({ remaining: 0, earnedToday: 750 });

      await expect(
        completeTask({ userId, taskItemId: itemIds[2]!, ...review }),
      ).rejects.toMatchObject({ code: "TASK_LIMIT_REACHED" });

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextDay = await completeTask({
        userId,
        taskItemId: itemIds[0]!,
        ...review,
        now: tomorrow,
      });
      expect(nextDay.completedToday).toBe(1);

      const completions = await listTaskCompletions(adminId, { userId });
      expect(completions.items).toHaveLength(3);
    },
    120_000,
  );
});
