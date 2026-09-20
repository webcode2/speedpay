import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { AppError } from "@/lib/app-error";
import { SESSION_COOKIE } from "@/lib/cookies";
import { getCurrentUser } from "@/services/auth-service";

export default async function DashboardPage() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    redirect("/login");
  }

  let email = "";
  try {
    const user = await getCurrentUser(token);
    email = user.email;
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw error;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
        Investor dashboard
      </p>
      <h1 className="text-3xl font-semibold">Signed in as {email}</h1>
      <p className="text-slate-400">
        Chunk 03 auth shell — portfolio features come in later chunks.
      </p>
      <LogoutButton />
      <Link className="text-sm text-emerald-400" href="/">
        Home
      </Link>
    </main>
  );
}
