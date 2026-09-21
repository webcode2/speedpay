"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
} from "../../_components/ui";

type Project = { id: string; name: string; status: string };

export default function AdminNewPackagePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    name: "",
    description: "",
    bannerImage: "",
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
        setForm((f) => ({ ...f, bannerImage: "" }));
        return;
      }
      setForm((f) => ({ ...f, bannerImage: json.data.storageKey }));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.bannerImage) {
      setError("Banner image is required.");
      return;
    }
    const res = await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId,
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
      setError(json.error?.message ?? "Create failed");
      return;
    }
    router.push(`/admin/packages/${json.data.package.id}`);
  }

  return (
    <div className="w-full">
      <Link
        href="/admin/packages"
        className="text-sm font-medium text-[var(--sp-lime-deep)]"
      >
        ← Packages
      </Link>
      <AdminPageHeader
        title="New package"
        subtitle="Draft investment product with banner"
      />
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
        <AdminCard className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Project</span>
            <div className="mt-1">
              <AdminSelect
                value={form.projectId}
                onChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status})
                  </option>
                ))}
              </AdminSelect>
            </div>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Name</span>
            <AdminInput
              className="mt-1 w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Description</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] outline-none ring-[var(--sp-lime)] focus:ring-2"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">
              Banner image
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-sm text-[var(--sp-muted)]"
              onChange={(e) => void onBanner(e.target.files?.[0] ?? null)}
              required={!form.bannerImage}
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
              ["maximumLots", "Max lots (optional)"],
              ["returnRate", "Return rate"],
              ["durationDays", "Duration days"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="font-medium text-[var(--sp-navy)]">{label}</span>
              <AdminInput
                className="mt-1 w-full"
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                required={key !== "maximumLots"}
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Return type</span>
            <div className="mt-1">
              <AdminSelect
                value={form.returnType}
                onChange={(v) => setForm((f) => ({ ...f, returnType: v }))}
              >
                <option value="FIXED_RETURN">FIXED_RETURN</option>
                <option value="FIXED_PROFIT">FIXED_PROFIT</option>
              </AdminSelect>
            </div>
          </label>
          {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Create draft
          </button>
        </AdminCard>
      </form>
    </div>
  );
}
