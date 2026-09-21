"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
} from "../../_components/ui";

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
    <div className="w-full">
      <Link
        href="/admin/projects"
        className="text-sm font-medium text-[var(--sp-lime-deep)]"
      >
        ← Projects
      </Link>
      <AdminPageHeader title="New project" subtitle="Create a solar / asset project" />
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
        <AdminCard className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Name</span>
            <AdminInput
              className="mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Description</span>
            <textarea
              className="mt-1 min-h-28 w-full rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] outline-none ring-[var(--sp-lime)] focus:ring-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </AdminCard>
        <AdminCard className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Location</span>
            <AdminInput
              className="mt-1 w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Capacity</span>
            <AdminInput
              className="mt-1 w-full"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
          <button
            type="submit"
            className="rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Create draft
          </button>
        </AdminCard>
      </form>
    </div>
  );
}
