import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

async function getDatabaseStatus(): Promise<"up" | "down"> {
  try {
    await getDb().execute(sql`select 1`);
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
        Investor portal and staff admin are live. Sign in to manage your
        portfolio.
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
      <div className="flex gap-4 text-sm">
        <a className="text-emerald-400" href="/login">
          Sign in
        </a>
        <a className="text-emerald-400" href="/register">
          Register
        </a>
        <a className="text-emerald-400" href="/dashboard">
          Dashboard
        </a>
      </div>
    </main>
  );
}
