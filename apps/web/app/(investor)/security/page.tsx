"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { InvestorPage } from "../_components/investor-page";

export default function SecurityPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Change password failed");
      return;
    }
    setMessage(json.data.message ?? "Password changed. Sign in again.");
    router.replace("/login");
  }

  async function onLogoutAll() {
    setError(null);
    const res = await fetch("/api/auth/logout-all", { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Logout-all failed");
      return;
    }
    router.replace("/login");
  }

  return (
    <InvestorPage title="Security">
      <form onSubmit={onChangePassword} className="grid max-w-md gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Current password
          <input
            name="currentPassword"
            type="password"
            required
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          New password
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950"
        >
          Change password
        </button>
      </form>
      <button
        type="button"
        onClick={() => void onLogoutAll()}
        className="w-fit rounded border border-slate-600 px-4 py-2 text-sm"
      >
        Sign out all sessions
      </button>
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
    </InvestorPage>
  );
}
