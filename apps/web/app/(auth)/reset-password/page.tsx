"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Request failed");
        return;
      }
      router.push("/login");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Reset token
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white"
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        New password
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white"
          type="password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
      >
        {loading ? "Please wait…" : "Update password"}
      </button>
      <Link className="text-sm text-emerald-400" href="/login">
        Back to sign in
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
      <Suspense fallback={<p className="text-slate-400">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
