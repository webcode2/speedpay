"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@solar.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Login failed");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-app flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md border border-[var(--sp-border)] bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/logo-light.jpeg"
            alt="SPEED PAY"
            width={48}
            height={48}
            className="rounded-lg object-contain"
            priority
          />
          <div>
            <p className="text-sm font-extrabold tracking-wide text-[var(--sp-navy)]">
              SPEED <span className="text-[var(--sp-lime)]">PAY</span>
            </p>
            <p className="text-xs text-[var(--sp-muted)]">Staff admin login</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-[var(--sp-muted)]">
          Investor accounts use{" "}
          <Link className="font-medium text-[var(--sp-lime-deep)]" href="/login">
            /login
          </Link>
          .
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-[var(--sp-navy)]">
            Email
            <input
              className="rounded-xl border border-[var(--sp-border)] bg-[var(--sp-surface)] px-3 py-2.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--sp-navy)]">
            Password
            <input
              className="rounded-xl border border-[var(--sp-border)] bg-[var(--sp-surface)] px-3 py-2.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--sp-danger)]">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-xl bg-[var(--sp-lime)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--sp-lime-deep)] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-[var(--sp-muted)]">
          Local seed: admin@solar.local / ChangeMeNow!123
        </p>
      </div>
    </main>
  );
}
