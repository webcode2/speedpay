import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: path.resolve(process.cwd(), "../../.env") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Lazily parse and cache validated env. Throws when DATABASE_URL is missing/invalid. */
export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      LOG_LEVEL: process.env.LOG_LEVEL,
    });
  }
  return cached;
}

/** Test helper — clears the cached parse result. */
export function resetEnvCache(): void {
  cached = undefined;
}
