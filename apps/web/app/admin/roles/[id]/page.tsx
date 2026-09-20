"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { hasAnyPermission } from "@/permissions/visibility";
import { AdminNav } from "../../_components/admin-nav";
import { useAdminPermissions } from "../../_components/admin-shell";

type Perm = { id: string; code: string; name: string };
type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
};

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const permissions = useAdminPermissions();
  const canUpdate = hasAnyPermission(permissions, ["roles.update"]);
  const [role, setRole] = useState<Role | null>(null);
  const [catalog, setCatalog] = useState<Perm[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const [roleRes, permRes] = await Promise.all([
      fetch(`/api/admin/roles/${id}`),
      fetch("/api/admin/permissions"),
    ]);
    const roleJson = await roleRes.json();
    const permJson = await permRes.json();
    if (!roleJson.success) {
      setError(roleJson.error?.message ?? "Failed to load");
      return;
    }
    const r = roleJson.data.role as Role;
    setRole(r);
    setSelected(r.permissions);
    if (permJson.success) setCatalog(permJson.data.items);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canUpdate || role?.code === "SUPER_ADMIN") return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionCodes: selected }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Update failed");
        return;
      }
      setMessage("Saved");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const locked = role?.code === "SUPER_ADMIN";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">
        {role ? `${role.code} — ${role.name}` : "Role"}
      </h1>
      <AdminNav />
      {locked ? (
        <p className="text-sm text-amber-400">
          SUPER_ADMIN permissions are seed-managed and cannot be edited here.
        </p>
      ) : null}
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      {role ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <fieldset className="rounded border border-slate-800 p-3">
            <legend className="px-1 text-sm text-slate-400">Permissions</legend>
            <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
              {catalog.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!canUpdate || locked}
                    checked={selected.includes(p.code)}
                    onChange={() => toggle(p.code)}
                  />
                  <span>
                    <span className="font-mono text-emerald-300">{p.code}</span>
                    {" — "}
                    {p.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {canUpdate && !locked ? (
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-emerald-700 px-4 py-2"
            >
              {loading ? "Saving…" : "Save permissions"}
            </button>
          ) : null}
        </form>
      ) : null}
    </main>
  );
}
