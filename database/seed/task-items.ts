import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { taskItems } from "../schema";
import * as schema from "../schema";

type Db = PostgresJsDatabase<typeof schema>;

export const TASK_ITEMS_SEED = [
  {
    title: "Solar Inverter Efficiency Sync",
    category: "Monitoring",
    description: "Verify the 3-phase hybrid inverter telemetry logs and sync efficiency ratings to the power grid controller.",
    imageKey: "solar-task-1",
    status: "ACTIVE",
    sortOrder: 1,
  },
  {
    title: "Photovoltaic Panel Dust Diagnostic",
    category: "Diagnostics",
    description: "Inspect dust and irradiance sensor values across Sector 4 photovoltaic solar arrays.",
    imageKey: "solar-task-2",
    status: "ACTIVE",
    sortOrder: 2,
  },
  {
    title: "Battery Storage Thermal Optimization",
    category: "Battery Health",
    description: "Calibrate thermal dissipation and temperature equilibrium on lithium battery rack B-12.",
    imageKey: "solar-task-3",
    status: "ACTIVE",
    sortOrder: 3,
  },
  {
    title: "Smart Grid Power Feed Verification",
    category: "Grid Feed",
    description: "Audit kilowatt-hour (kWh) clean energy dispatch values submitted to the regional microgrid distribution node.",
    imageKey: "solar-task-4",
    status: "ACTIVE",
    sortOrder: 4,
  },
  {
    title: "Daily Solar Plant Performance Log",
    category: "Reports",
    description: "Compile peak sunlight hour wattage metrics and confirm carbon offset production records.",
    imageKey: "solar-task-5",
    status: "ACTIVE",
    sortOrder: 5,
  },
  {
    title: "MPPT Charge Controller Load Balancing",
    category: "Optimization",
    description: "Run diagnostic algorithm to balance voltage drops and maximize Maximum Power Point Tracking efficiency.",
    imageKey: "solar-task-6",
    status: "ACTIVE",
    sortOrder: 6,
  },
  {
    title: "Substation Relay Safety Check",
    category: "Safety",
    description: "Confirm circuit protection switch status and high-voltage surge arrester readiness.",
    imageKey: "solar-task-7",
    status: "ACTIVE",
    sortOrder: 7,
  },
  {
    title: "Clean Energy Dividend Yield Audit",
    category: "Yield",
    description: "Cross-check commercial energy sales tariff logs against generated kWh block tokens.",
    imageKey: "solar-task-8",
    status: "ACTIVE",
    sortOrder: 8,
  },
  {
    title: "Harmonic Filter Frequency Review",
    category: "Grid Feed",
    description: "Check AC sine-wave frequency stability and suppress harmonic distortions on outgoing feeder line.",
    imageKey: "solar-task-9",
    status: "ACTIVE",
    sortOrder: 9,
  },
  {
    title: "End-of-Day Microgrid Health Check",
    category: "Diagnostics",
    description: "Execute automated evening health check script to lock daily generated profits and sync investor wallets.",
    imageKey: "solar-task-10",
    status: "ACTIVE",
    sortOrder: 10,
  },
];

export async function seedTaskItems(db: Db) {
  let created = 0;
  let updated = 0;

  for (const item of TASK_ITEMS_SEED) {
    const [existing] = await db
      .select({ id: taskItems.id })
      .from(taskItems)
      .where(eq(taskItems.title, item.title))
      .limit(1);

    if (existing) {
      await db
        .update(taskItems)
        .set({
          ...item,
          updatedAt: new Date(),
        })
        .where(eq(taskItems.id, existing.id));
      updated += 1;
    } else {
      await db.insert(taskItems).values(item);
      created += 1;
    }
  }

  return { created, updated };
}
