"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Version = {
  id: string;
  version: number;
  lotPrice: string;
  returnType: string;
  returnRate: string;
  durationDays: number;
};

type Pkg = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  lotPrice: string;
  totalLots: number;
  reservedLots: number;
  soldLots: number;
  availableLots: number;
  minimumLots: number;
  maximumLots: number | null;
  returnType: string;
  returnRate: string;
  durationDays: number;
  projectName?: string;
  versions?: Version[];
};

export default function AdminPackageDetailPage() {
  const params = useParams<{ id: string }>();
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    lotPrice: "",
    totalLots: "",
    minimumLots: "",
    maximumLots: "",
    returnType: "FIXED_RETURN",
    returnRate: "",
    durationDays: "",
  });

  async function load() {
    const res = await fetch(`/api/admin/packages/${params.id}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed");
      return;
    }
    const p = json.data.package as Pkg;
    setPkg(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      lotPrice: p.lotPrice,
      totalLots: String(p.totalLots),
      minimumLots: String(p.minimumLots),
      maximumLots: p.maximumLots != null ? String(p.maximumLots) : "",
      returnType: p.returnType,
      returnRate: p.returnRate,
      durationDays: String(p.durationDays),
    });
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!pkg) return;
    const res = await fetch(`/api/admin/packages/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: pkg.projectId,
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
      setError(json.error?.message ?? "Save failed");
      return;
    }
    setMessage("Saved");
    await load();
  }

  async function act(action: string) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/packages/${params.id}/${action}`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Action failed");
      return;
    }
    setMessage(action);
    await load();
  }

  if (!pkg) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <p className="text-slate-400">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <Link className="text-sm text-emerald-400" href="/admin/packages">
        ← Packages
      </Link>
      <h1 className="text-3xl font-semibold">{pkg.name}</h1>
      <p className="text-slate-400">
        {pkg.projectName} · {pkg.status} · available {pkg.availableLots} / total{" "}
        {pkg.totalLots} (reserved {pkg.reservedLots}, sold {pkg.soldLots})
      </p>

      <form onSubmit={save} className="flex flex-col gap-3">
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <textarea
          className="min-h-20 rounded border border-slate-600 bg-slate-900 px-3 py-2"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        {(
          [
            ["lotPrice", "Lot price"],
            ["totalLots", "Total lots"],
            ["minimumLots", "Min lots"],
            ["maximumLots", "Max lots"],
            ["returnRate", "Return rate"],
            ["durationDays", "Duration days"],
          ] as const
        ).map(([key, label]) => (
          <input
            key={key}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
            placeholder={label}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        ))}
        <select
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          value={form.returnType}
          onChange={(e) => setForm({ ...form, returnType: e.target.value })}
        >
          <option value="FIXED_RETURN">FIXED_RETURN</option>
          <option value="FIXED_PROFIT">FIXED_PROFIT</option>
        </select>
        <button
          type="submit"
          className="w-fit rounded bg-slate-100 px-4 py-2 text-slate-950"
        >
          Save
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(["activate", "pause", "close", "archive"] as const).map((action) => (
          <button
            key={action}
            type="button"
            className="rounded bg-emerald-500/90 px-3 py-2 text-sm text-slate-950"
            onClick={() => void act(action)}
          >
            {action}
          </button>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-lg font-medium">Versions</h2>
        <ul className="space-y-1 text-sm text-slate-300">
          {(pkg.versions ?? []).map((v) => (
            <li key={v.id}>
              v{v.version}: {v.lotPrice} · {v.returnType} {v.returnRate}% ·{" "}
              {v.durationDays}d
            </li>
          ))}
          {(pkg.versions ?? []).length === 0 ? (
            <li className="text-slate-500">No snapshots yet (activate to create)</li>
          ) : null}
        </ul>
      </section>

      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
    </main>
  );
}
