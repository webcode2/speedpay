"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  StatusPill,
} from "../../_components/ui";

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
  bannerImage: string | null;
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
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    bannerImage: "",
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
      bannerImage: p.bannerImage ?? "",
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

  async function onBanner(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setPreview(URL.createObjectURL(file));
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/media/image", {
        method: "POST",
        body,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Upload failed");
        return;
      }
      setForm((f) => ({ ...f, bannerImage: json.data.storageKey }));
    } finally {
      setUploading(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!pkg) return;
    if (!form.bannerImage) {
      setError("Banner image is required.");
      return;
    }
    const res = await fetch(`/api/admin/packages/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: pkg.projectId,
        name: form.name,
        description: form.description || null,
        bannerImage: form.bannerImage,
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
    return <p className="text-[var(--sp-muted)]">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="w-full space-y-4">
      <Link
        href="/admin/packages"
        className="text-sm font-medium text-[var(--sp-lime-deep)]"
      >
        ← Packages
      </Link>
      <AdminPageHeader
        title={pkg.name}
        subtitle={`${pkg.projectName ?? ""} · available ${pkg.availableLots} / ${pkg.totalLots}`}
        actions={<StatusPill status={pkg.status} />}
      />

      <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
        <AdminCard className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Name</span>
            <AdminInput
              className="mt-1 w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Description</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] outline-none ring-[var(--sp-lime)] focus:ring-2"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Banner</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-sm text-[var(--sp-muted)]"
              onChange={(e) => void onBanner(e.target.files?.[0] ?? null)}
            />
            {uploading ? (
              <p className="mt-1 text-xs text-[var(--sp-muted)]">Uploading…</p>
            ) : null}
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Banner preview"
                className="mt-3 h-40 w-full rounded-2xl object-cover"
              />
            ) : null}
            {form.bannerImage ? (
              <p className="mt-1 truncate font-mono text-xs text-[var(--sp-muted)]">
                {form.bannerImage}
              </p>
            ) : null}
          </label>
        </AdminCard>
        <AdminCard className="space-y-3">
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
            <label key={key} className="block text-sm">
              <span className="font-medium text-[var(--sp-navy)]">{label}</span>
              <AdminInput
                className="mt-1 w-full"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Return type</span>
            <div className="mt-1">
              <AdminSelect
                value={form.returnType}
                onChange={(v) => setForm({ ...form, returnType: v })}
              >
                <option value="FIXED_RETURN">FIXED_RETURN</option>
                <option value="FIXED_PROFIT">FIXED_PROFIT</option>
              </AdminSelect>
            </div>
          </label>
          {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
          {message ? (
            <p className="text-[var(--sp-lime-deep)]">{message}</p>
          ) : null}
          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save
          </button>
        </AdminCard>
      </form>

      <div className="flex flex-wrap gap-2">
        {(["activate", "pause", "close", "archive"] as const).map((action) => (
          <button
            key={action}
            type="button"
            className="rounded-xl bg-[var(--sp-lime)] px-3 py-2 text-sm font-semibold text-white"
            onClick={() => void act(action)}
          >
            {action}
          </button>
        ))}
      </div>

      <AdminCard>
        <h2 className="mb-2 font-semibold text-[var(--sp-navy)]">Versions</h2>
        <ul className="space-y-1 text-sm text-[var(--sp-muted)]">
          {(pkg.versions ?? []).map((v) => (
            <li key={v.id}>
              v{v.version}: {v.lotPrice} · {v.returnType} {v.returnRate} ·{" "}
              {v.durationDays}d
            </li>
          ))}
          {(pkg.versions ?? []).length === 0 ? <li>No versions yet</li> : null}
        </ul>
      </AdminCard>
    </div>
  );
}
