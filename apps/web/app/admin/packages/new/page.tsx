"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Project = { id: string; name: string; status: string };

export default function AdminNewPackagePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: "",
    name: "",
    description: "",
    lotPrice: "100000",
    totalLots: "100",
    minimumLots: "1",
    maximumLots: "",
    returnType: "FIXED_RETURN",
    returnRate: "12",
    durationDays: "365",
  });

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/projects");
      const json = await res.json();
      if (json.success) {
        const items = json.data.items as Project[];
        setProjects(items.filter((p) => p.status !== "ARCHIVED"));
        if (items[0]) setForm((f) => ({ ...f, projectId: items[0]!.id }));
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId,
        name: form.name,
        description: form.description || null,
        lotPrice: form.lotPrice,
        totalLots: Number(form.totalLots),
        minimumLots: Number(form.minimumLots),
        maximumLots: form.maximumLots ? Number(form.maximumLots) : null,
        returnType: form.returnType,
        returnRate: form.returnRate,
        durationDays: Number(form.durationDays),
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Create failed");
      return;
    }
    router.push(`/admin/packages/${json.data.package.id}`);
  }

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-6 py-10">
      <Link className="text-sm text-emerald-400" href="/admin/packages">
        ← Packages
      </Link>
      <h1 className="text-3xl font-semibold">New package</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <select
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          value={form.projectId}
          onChange={(e) => set("projectId", e.target.value)}
          required
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.status})
            </option>
          ))}
        </select>
        {(
          [
            ["name", "Name"],
            ["lotPrice", "Lot price"],
            ["totalLots", "Total lots"],
            ["minimumLots", "Min lots"],
            ["maximumLots", "Max lots (optional)"],
            ["returnRate", "Return rate"],
            ["durationDays", "Duration days"],
          ] as const
        ).map(([key, label]) => (
          <input
            key={key}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
            placeholder={label}
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
            required={key !== "maximumLots"}
          />
        ))}
        <select
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          value={form.returnType}
          onChange={(e) => set("returnType", e.target.value)}
        >
          <option value="FIXED_RETURN">FIXED_RETURN</option>
          <option value="FIXED_PROFIT">FIXED_PROFIT</option>
        </select>
        <textarea
          className="min-h-20 rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
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
