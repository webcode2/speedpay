# Chunk 01 — Repository Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a pnpm/Turborepo monorepo with Next.js web app, Docker Postgres, Drizzle migrations (`system_settings`), shared types/config, API envelope helpers, structured logging, and a working `/api/health` endpoint.

**Architecture:** Web-first monorepo. `@solar/database` owns schema/migrations; `@solar/web` owns the Next.js App Router app and DB client; `@solar/types` and `@solar/config` are shared packages. No auth, finance, Flutter, or background workers.

**Tech Stack:** Node 22+, pnpm, Turborepo, Next.js 15 (App Router), TypeScript, Tailwind CSS, Drizzle ORM, postgres.js, Zod, Vitest, PostgreSQL 16 (Docker Compose)

**Spec:** [docs/superpowers/specs/2026-09-20-chunk-01-repository-foundation-design.md](../specs/2026-09-20-chunk-01-repository-foundation-design.md)

## Global Constraints

- No cron, workers, queues, BullMQ, Celery, or Redis workers
- No authentication, users, wallets, or investment domain code
- No Flutter / `apps/mobile` in this chunk
- Financial logic must never live in client components (N/A for C01; keep pattern)
- Workspace packages: `@solar/types`, `@solar/config`, `@solar/database`, `@solar/web`
- API envelope: `{ success: true, data }` / `{ success: false, error: { code, message } }`
- Never expose database/stack traces to API clients
- Postgres credentials: user `solar`, password `solar`, database `solar_investment`
- `DATABASE_URL=postgresql://solar:solar@localhost:5432/solar_investment`
- Commit only when the user explicitly requests a commit (do not auto-commit unless asked)

---

## File Structure (target)

```text
.gitignore
.env.example
package.json
pnpm-workspace.yaml
turbo.json
docker-compose.yml
README.md
packages/config/package.json
packages/config/tsconfig.base.json
packages/config/tsconfig.nextjs.json
packages/types/package.json
packages/types/tsconfig.json
packages/types/src/index.ts
packages/types/src/api.ts
database/package.json
database/tsconfig.json
database/drizzle.config.ts
database/schema/index.ts
database/schema/system-settings.ts
database/migrations/          # generated
database/seed/index.ts
apps/web/package.json
apps/web/tsconfig.json
apps/web/next.config.ts
apps/web/postcss.config.mjs
apps/web/tailwind.config.ts
apps/web/vitest.config.ts
apps/web/app/globals.css
apps/web/app/layout.tsx
apps/web/app/page.tsx
apps/web/app/api/health/route.ts
apps/web/src/env.ts
apps/web/src/db/index.ts
apps/web/src/lib/logger.ts
apps/web/src/lib/api-response.ts
apps/web/src/lib/api-response.test.ts
apps/web/src/env.test.ts
```

---

### Task 1: Root workspace, Docker Compose, and env template

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: nothing
- Produces: pnpm workspace root; Compose service `postgres` on port `5432`; env template with `DATABASE_URL`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
node_modules
.turbo
.next
dist
coverage
.env
.env.local
.env.*.local
*.log
.DS_Store
```

- [ ] **Step 2: Create `.env.example`**

```env
DATABASE_URL=postgresql://solar:solar@localhost:5432/solar_investment
NODE_ENV=development
LOG_LEVEL=info
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "database"
```

- [ ] **Step 4: Create root `package.json`**

```json
{
  "name": "solar-investment",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:generate": "pnpm --filter @solar/database generate",
    "db:migrate": "pnpm --filter @solar/database migrate",
    "db:studio": "pnpm --filter @solar/database studio",
    "db:seed": "pnpm --filter @solar/database seed"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 5: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 6: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: solar-investment-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: solar
      POSTGRES_PASSWORD: solar
      POSTGRES_DB: solar_investment
    volumes:
      - solar_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U solar -d solar_investment"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  solar_pg_data:
```

- [ ] **Step 7: Copy env and start Postgres**

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

Expected: `postgres` service healthy/running on `0.0.0.0:5432`.

- [ ] **Step 8: Commit only if user requested** — skip unless asked; otherwise continue.

---

### Task 2: `@solar/config` TypeScript baselines

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.base.json`
- Create: `packages/config/tsconfig.nextjs.json`

**Interfaces:**
- Consumes: nothing
- Produces: extendable tsconfigs at `@solar/config/tsconfig.base.json` and `@solar/config/tsconfig.nextjs.json`

- [ ] **Step 1: Create `packages/config/package.json`**

```json
{
  "name": "@solar/config",
  "version": "0.0.0",
  "private": true,
  "files": ["tsconfig.base.json", "tsconfig.nextjs.json"]
}
```

- [ ] **Step 2: Create `packages/config/tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

- [ ] **Step 3: Create `packages/config/tsconfig.nextjs.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "preserve",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "allowJs": true
  }
}
```

---

### Task 3: `@solar/types` API envelope types

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/api.ts`
- Create: `packages/types/src/index.ts`

**Interfaces:**
- Consumes: `@solar/config` tsconfig base
- Produces:
  - `type ApiErrorCode = "INTERNAL_ERROR" | "DATABASE_UNAVAILABLE" | "VALIDATION_ERROR"`
  - `type ApiErrorBody = { code: ApiErrorCode; message: string }`
  - `type ApiSuccess<T> = { success: true; data: T }`
  - `type ApiFailure = { success: false; error: ApiErrorBody }`
  - `type ApiResponse<T> = ApiSuccess<T> | ApiFailure`

- [ ] **Step 1: Create `packages/types/package.json`**

```json
{
  "name": "@solar/types",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json --noEmit",
    "lint": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `packages/types/tsconfig.json`**

```json
{
  "extends": "@solar/config/tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/types/src/api.ts`**

```ts
export type ApiErrorCode =
  | "INTERNAL_ERROR"
  | "DATABASE_UNAVAILABLE"
  | "VALIDATION_ERROR";

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: ApiErrorBody;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
```

- [ ] **Step 4: Create `packages/types/src/index.ts`**

```ts
export type {
  ApiErrorCode,
  ApiErrorBody,
  ApiSuccess,
  ApiFailure,
  ApiResponse,
} from "./api";
```

---

### Task 4: `@solar/database` schema, Drizzle config, seed stub

**Files:**
- Create: `database/package.json`
- Create: `database/tsconfig.json`
- Create: `database/drizzle.config.ts`
- Create: `database/schema/system-settings.ts`
- Create: `database/schema/index.ts`
- Create: `database/seed/index.ts`
- Generate: `database/migrations/*`

**Interfaces:**
- Consumes: Docker Postgres from Task 1; `DATABASE_URL`
- Produces:
  - `systemSettings` table export
  - scripts: `generate`, `migrate`, `studio`, `seed`
  - applied migration creating `system_settings`

- [ ] **Step 1: Create `database/package.json`**

```json
{
  "name": "@solar/database",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./schema/index.ts",
    "./schema": "./schema/index.ts"
  },
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "studio": "drizzle-kit studio",
    "seed": "tsx seed/index.ts",
    "build": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.38.3",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.1",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "dotenv": "^16.4.7"
  }
}
```

- [ ] **Step 2: Create `database/tsconfig.json`**

```json
{
  "extends": "@solar/config/tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist",
    "noEmit": true
  },
  "include": ["schema", "seed", "drizzle.config.ts"]
}
```

- [ ] **Step 3: Create `database/schema/system-settings.ts`**

```ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

- [ ] **Step 4: Create `database/schema/index.ts`**

```ts
export { systemSettings } from "./system-settings";
```

- [ ] **Step 5: Create `database/drizzle.config.ts`**

```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "../.env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for drizzle-kit");
}

export default defineConfig({
  schema: "./schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

- [ ] **Step 6: Create `database/seed/index.ts`**

```ts
console.info("[seed] no seed data in Chunk 01");
```

- [ ] **Step 7: Install workspace deps from repo root**

```bash
pnpm install
```

Expected: lockfile created; packages link successfully.

- [ ] **Step 8: Generate and apply migration**

```bash
pnpm db:generate
pnpm db:migrate
```

Expected: migration SQL under `database/migrations/` creating `system_settings`; migrate exits 0.

- [ ] **Step 9: Verify table exists**

```bash
docker compose exec postgres psql -U solar -d solar_investment -c '\d system_settings'
```

Expected: table with columns `key`, `value`, `updated_at`.

---

### Task 5: Scaffold `@solar/web` Next.js app shell

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx` (temporary placeholder; replaced in Task 7)

**Interfaces:**
- Consumes: `@solar/config`, `@solar/types`, `@solar/database`
- Produces: Next.js app that builds/starts on port 3000

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@solar/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "@solar/database": "workspace:*",
    "@solar/types": "workspace:*",
    "drizzle-orm": "^0.38.3",
    "next": "^15.1.3",
    "postgres": "^3.4.5",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@solar/config": "workspace:*",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "@solar/config/tsconfig.nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/web/next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@solar/types", "@solar/database"],
};

export default nextConfig;
```

- [ ] **Step 4: Create `apps/web/postcss.config.mjs`**

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

- [ ] **Step 5: Create `apps/web/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Create `apps/web/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0f172a;
  --fg: #e2e8f0;
  --muted: #94a3b8;
  --ok: #34d399;
  --bad: #f87171;
}

body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at top, #1e293b, var(--bg));
  color: var(--fg);
  font-family: ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 7: Create `apps/web/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solar Investment",
  description: "Solar investment platform foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create temporary `apps/web/app/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
        Solar Investment
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Platform foundation</h1>
      <p className="text-slate-400">Chunk 01 scaffold — health status coming next.</p>
    </main>
  );
}
```

- [ ] **Step 9: Reinstall and smoke-run**

```bash
pnpm install
pnpm --filter @solar/web dev
```

Expected: Next.js ready on `http://localhost:3000` without TypeScript errors. Stop the server after smoke check.

---

### Task 6: Env validation, logger, API helpers (TDD)

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/env.ts`
- Create: `apps/web/src/env.test.ts`
- Create: `apps/web/src/lib/logger.ts`
- Create: `apps/web/src/lib/api-response.ts`
- Create: `apps/web/src/lib/api-response.test.ts`

**Interfaces:**
- Consumes: `@solar/types` (`ApiErrorCode`, `ApiResponse`)
- Produces:
  - `env` object with `DATABASE_URL`, `NODE_ENV`, `LOG_LEVEL`
  - `logger.info|warn|error|debug(message, meta?)`
  - `apiSuccess<T>(data: T, init?: ResponseInit): Response`
  - `apiError(code: ApiErrorCode, message: string, status?: number, init?: ResponseInit): Response`

- [ ] **Step 1: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Write failing env tests — `apps/web/src/env.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env", () => {
  it("accepts valid environment values", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://solar:solar@localhost:5432/solar_investment");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "info");

    const { env } = await import("./env");

    expect(env.DATABASE_URL).toContain("solar_investment");
    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("rejects missing DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "info");

    await expect(import("./env")).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run env tests — expect FAIL**

```bash
pnpm --filter @solar/web test -- src/env.test.ts
```

Expected: FAIL because `./env` does not exist.

- [ ] **Step 4: Implement `apps/web/src/env.ts`**

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
```

Note: Vitest must load dotenv or the web app must read root `.env`. For Next.js, also create `apps/web/.env` symlink or copy — prefer loading root env in Next via `apps/web/next.config.ts` is not enough. **Do this:** add to `apps/web/package.json` scripts:

```json
"dev": "node --env-file=../../.env ./node_modules/next/dist/bin/next dev --port 3000",
"test": "node --env-file=../../.env ./node_modules/vitest/vitest.mjs run"
```

If Node `--env-file` is unavailable, use `dotenv` in `env.ts` for non-Next contexts:

```ts
import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv({ path: path.resolve(process.cwd(), "../../.env") });
```

Add `dotenv` dependency to `@solar/web` if using this approach. Prefer `dotenv` load at top of `env.ts` for reliability across Next and Vitest.

Updated `env.ts` opening:

```ts
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: path.resolve(process.cwd(), "../../.env") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });
```

Add dependency: `"dotenv": "^16.4.7"` in `apps/web/package.json`.

- [ ] **Step 5: Re-run env tests — expect PASS**

```bash
pnpm --filter @solar/web exec vitest run src/env.test.ts
```

Expected: both tests PASS. For the rejection test, ensure empty string fails `min(1)`.

- [ ] **Step 6: Write failing API response tests — `apps/web/src/lib/api-response.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { apiError, apiSuccess } from "./api-response";

describe("apiSuccess", () => {
  it("returns success envelope with data", async () => {
    const res = apiSuccess({ status: "ok" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { status: "ok" },
    });
  });
});

describe("apiError", () => {
  it("returns error envelope with default 500", async () => {
    const res = apiError("INTERNAL_ERROR", "Something went wrong.");
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong.",
      },
    });
  });

  it("allows custom status for DATABASE_UNAVAILABLE", async () => {
    const res = apiError(
      "DATABASE_UNAVAILABLE",
      "Database is unavailable.",
      503,
    );
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 7: Run API tests — expect FAIL**

```bash
pnpm --filter @solar/web exec vitest run src/lib/api-response.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 8: Implement `apps/web/src/lib/api-response.ts`**

```ts
import type { ApiErrorCode, ApiResponse } from "@solar/types";

export function apiSuccess<T>(data: T, init?: ResponseInit): Response {
  const body: ApiResponse<T> = { success: true, data };
  return Response.json(body, { status: 200, ...init });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 500,
  init?: ResponseInit,
): Response {
  const body: ApiResponse<never> = {
    success: false,
    error: { code, message },
  };
  return Response.json(body, { status, ...init });
}
```

- [ ] **Step 9: Re-run API tests — expect PASS**

```bash
pnpm --filter @solar/web exec vitest run src/lib/api-response.test.ts
```

- [ ] **Step 10: Implement `apps/web/src/lib/logger.ts`**

```ts
import { env } from "@/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  return levelRank[level] >= levelRank[env.LOG_LEVEL];
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ?? {}),
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    write("error", message, meta),
};
```

- [ ] **Step 11: Run full web test suite**

```bash
pnpm --filter @solar/web test
```

Expected: all tests PASS.

---

### Task 7: DB client, health route, landing page

**Files:**
- Create: `apps/web/src/db/index.ts`
- Create: `apps/web/app/api/health/route.ts`
- Modify: `apps/web/app/page.tsx`

**Interfaces:**
- Consumes: `env.DATABASE_URL`, `apiSuccess`, `apiError`, `logger`, `@solar/database` schema (optional for health)
- Produces:
  - `db` Drizzle client export
  - `GET /api/health` → 200 + `{ status, database: "up", timestamp }` or 503 `DATABASE_UNAVAILABLE`
  - Landing page shows Connected / Database unavailable

- [ ] **Step 1: Create `apps/web/src/db/index.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@solar/database/schema";
import { env } from "@/env";

const client = postgres(env.DATABASE_URL, {
  max: 10,
});

export const db = drizzle(client, { schema });
```

- [ ] **Step 2: Create `apps/web/app/api/health/route.ts`**

```ts
import { sql } from "drizzle-orm";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { db } from "@/db";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await db.execute(sql`select 1`);
    logger.info("health.check", { database: "up" });
    return apiSuccess({
      status: "ok" as const,
      database: "up" as const,
      timestamp,
    });
  } catch (error) {
    logger.error("health.check_failed", {
      database: "down",
      reason: error instanceof Error ? error.message : "unknown",
    });
    return apiError(
      "DATABASE_UNAVAILABLE",
      "Database is unavailable.",
      503,
    );
  }
}
```

- [ ] **Step 3: Replace `apps/web/app/page.tsx`**

```tsx
import { sql } from "drizzle-orm";
import { db } from "@/db";

async function getDatabaseStatus(): Promise<"up" | "down"> {
  try {
    await db.execute(sql`select 1`);
    return "up";
  } catch {
    return "down";
  }
}

export default async function HomePage() {
  const database = await getDatabaseStatus();
  const connected = database === "up";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
        Solar Investment
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Platform foundation
      </h1>
      <p className="text-slate-400">
        Chunk 01 — Next.js, PostgreSQL, and Drizzle are wired end-to-end.
      </p>
      <p
        className={
          connected
            ? "text-emerald-400"
            : "text-red-400"
        }
      >
        {connected ? "Connected" : "Database unavailable"}
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Start app and verify health**

```bash
pnpm --filter @solar/web dev
```

In another shell:

```bash
curl -s http://localhost:3000/api/health | jq
```

Expected:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "up",
    "timestamp": "<iso>"
  }
}
```

Open `http://localhost:3000` — page shows **Connected**.

- [ ] **Step 5: Verify DB-down path (optional local check)**

```bash
docker compose stop postgres
curl -s -o /tmp/health.json -w "%{http_code}" http://localhost:3000/api/health
cat /tmp/health.json
docker compose start postgres
```

Expected: HTTP `503` and `error.code === "DATABASE_UNAVAILABLE"`. Restart Postgres afterward.

---

### Task 8: README and Definition of Done verification

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: all prior tasks
- Produces: documented developer workflow matching the spec

- [ ] **Step 1: Create `README.md`** with these sections (exact content):

Title: `# Solar Investment Platform`

Body must include:

- One-line description: Next.js full-stack monorepo + PostgreSQL; Flutter deferred
- Prerequisites: Node.js 22+, pnpm 9+, Docker Compose
- Quick start commands (in a bash fence):
  - `cp .env.example .env`
  - `docker compose up -d`
  - `pnpm install`
  - `pnpm db:migrate`
  - `pnpm --filter @solar/web dev`
- URLs: `http://localhost:3000` and `/api/health`
- Workspace layout bullets for `apps/web`, `packages/types`, `packages/config`, `database`, and note that `apps/mobile` is not created yet
- Scripts table for web `dev`/`test`, `db:migrate`, `db:seed`
- Architecture notes: no cron/workers; financial calc server-side later; API envelope shape
- Links to the Chunk 01 design and this plan under `docs/superpowers/`
- [ ] **Step 2: Full verification checklist**

Run:

```bash
docker compose up -d
pnpm install
pnpm db:migrate
pnpm --filter @solar/web test
pnpm --filter @solar/web build
pnpm --filter @solar/web dev
```

Confirm:

- [ ] `/api/health` returns 200 with `database: "up"`
- [ ] Landing page shows Connected
- [ ] `system_settings` exists in Postgres
- [ ] No auth/financial/Flutter code present
- [ ] TypeScript build succeeds

- [ ] **Step 3: Stop here** — Chunk 01 complete. Do not start Chunk 02 unless requested. Commit only if the user asks.

---

## Plan Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| Monorepo layout / Turborepo / pnpm | Task 1 |
| Docker Compose Postgres | Task 1 |
| `.env.example` / env validation | Tasks 1, 6 |
| `@solar/config` | Task 2 |
| `@solar/types` + API envelope | Tasks 3, 6 |
| `@solar/database` + `system_settings` + migrate/seed | Task 4 |
| Next.js + Tailwind shell | Task 5 |
| Logger | Task 6 |
| Health endpoint + landing status | Task 7 |
| Vitest for env + api-response | Task 6 |
| README + DoD | Task 8 |
| Non-goals (no auth/finance/Flutter/workers) | Global Constraints + Task 8 check |

**Placeholder scan:** none remaining after locking dotenv approach and package versions.

**Type consistency:** `ApiErrorCode`, `apiSuccess`, `apiError`, `env`, `db`, `logger` names match across Tasks 3, 6, and 7.
