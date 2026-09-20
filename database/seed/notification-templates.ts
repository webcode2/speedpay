import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { notificationTemplates } from "../schema";
import type * as schema from "../schema";

type Db = PostgresJsDatabase<typeof schema>;

export const NOTIFICATION_TEMPLATE_SEED = [
  {
    code: "ACCOUNT_CREATED",
    title: "Welcome",
    body: "Your Solar Investment account is ready. Complete verification to invest.",
  },
  {
    code: "INVESTMENT_CREATED",
    title: "Investment confirmed",
    body: "You invested {{amount}} in {{packageName}}.",
  },
  {
    code: "DEPOSIT_COMPLETED",
    title: "Deposit successful",
    body: "Your deposit of {{amount}} {{currency}} is complete.",
  },
  {
    code: "WITHDRAWAL_REQUESTED",
    title: "Withdrawal submitted",
    body: "Your withdrawal of {{amount}} is pending review.",
  },
  {
    code: "WITHDRAWAL_COMPLETED",
    title: "Withdrawal completed",
    body: "Your withdrawal of {{amount}} has been processed.",
  },
  {
    code: "INVESTMENT_MATURED",
    title: "Investment matured",
    body: "Your investment matured. {{maturityValue}} was credited to your wallet.",
  },
  {
    code: "REINVESTMENT_COMPLETED",
    title: "Reinvestment complete",
    body: "You reinvested {{amount}} into a new package.",
  },
] as const;

export async function seedNotificationTemplates(db: Db) {
  for (const t of NOTIFICATION_TEMPLATE_SEED) {
    const [existing] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.code, t.code))
      .limit(1);
    if (existing) {
      await db
        .update(notificationTemplates)
        .set({
          title: t.title,
          body: t.body,
          updatedAt: new Date(),
        })
        .where(eq(notificationTemplates.code, t.code));
    } else {
      await db.insert(notificationTemplates).values({
        code: t.code,
        title: t.title,
        body: t.body,
        channel: "IN_APP",
      });
    }
  }
}
