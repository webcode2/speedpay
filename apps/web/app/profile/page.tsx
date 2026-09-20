"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type ProfileData = {
  complete: boolean;
  profile: {
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  user: { email: string; status: string };
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/profile");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load profile");
      setLoading(false);
      return;
    }
    setData(json.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(
      [...form.entries()].map(([k, v]) => [k, String(v) || null]),
    );
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Update failed");
      return;
    }
    setData(json.data);
    setMessage("Profile saved.");
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
        <p className="text-slate-400">Loading profile…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
        <p className="text-red-400">{error ?? "Unavailable"}</p>
      </main>
    );
  }

  const p = data.profile;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">Profile</h1>
      <p className="text-slate-400">
        {data.user.email} · status {data.user.status} ·{" "}
        {data.complete ? "Ready for KYC" : "Incomplete for KYC"}
      </p>
      <form onSubmit={onSubmit} className="grid gap-3">
        {(
          [
            ["firstName", "First name", p.firstName],
            ["lastName", "Last name", p.lastName],
            ["middleName", "Middle name", p.middleName],
            ["dateOfBirth", "Date of birth (YYYY-MM-DD)", p.dateOfBirth],
            ["gender", "Gender", p.gender],
            ["address", "Address", p.address],
            ["city", "City", p.city],
            ["state", "State", p.state],
            ["country", "Country", p.country],
          ] as const
        ).map(([name, label, value]) => (
          <label key={name} className="flex flex-col gap-1 text-sm text-slate-300">
            {label}
            <input
              name={name}
              defaultValue={value ?? ""}
              className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
        ))}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        <button
          type="submit"
          className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950"
        >
          Save profile
        </button>
      </form>
      <div className="flex gap-4 text-sm">
        <Link className="text-emerald-400" href="/verification">
          Verification
        </Link>
        <Link className="text-emerald-400" href="/dashboard">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
