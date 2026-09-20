"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, phone: phone || null };
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Request failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {mode === "login" ? "Sign in" : "Create account"}
      </h1>
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
      <label className="flex flex-col gap-1 text-sm text-slate-300">
        Password
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white"
          type="password"
          required
          minLength={mode === "register" ? 12 : 1}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {mode === "register" ? (
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Phone (optional)
          <input
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950 disabled:opacity-60"
      >
        {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
      </button>
      <p className="text-sm text-slate-400">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link className="text-emerald-400" href="/register">
              Register
            </Link>
            {" · "}
            <Link className="text-emerald-400" href="/forgot-password">
              Forgot password
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link className="text-emerald-400" href="/login">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
