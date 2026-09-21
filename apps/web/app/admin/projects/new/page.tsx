"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AdminNewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        location: location || null,
        capacity: capacity || null,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Create failed");
      return;
    }
    router.push(`/admin/projects/${json.data.project.id}`);
  }

  return (
    <main className="flex w-full flex-col gap-4">
      <Link className="text-sm text-emerald-400" href="/admin/projects">
        ← Projects
      </Link>
      <h1 className="text-3xl font-semibold">New project</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          className="min-h-24 rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        {error ? <p className="text-red-400">{error}</p> : null}
        <button
          type="submit"
          className="rounded bg-emerald-500 px-4 py-2 text-slate-950"
        >
          Create draft
        </button>
      </form>
    </main>
  );
}
