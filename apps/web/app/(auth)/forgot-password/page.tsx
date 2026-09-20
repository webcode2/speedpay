"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setResetToken(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Request failed");
        return;
      }
      setMessage(json.data.message);
      if (json.data.resetToken) {
        setResetToken(json.data.resetToken);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
      <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Email
          <input
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        {resetToken ? (
          <p className="break-all text-xs text-slate-400">
            Dev reset token:{" "}
            <Link
              className="text-emerald-400"
              href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
            >
              continue reset
            </Link>
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
        >
          {loading ? "Please wait…" : "Send reset link"}
        </button>
        <Link className="text-sm text-emerald-400" href="/login">
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
