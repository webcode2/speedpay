"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { hasAnyPermission } from "@/permissions/visibility";
import { AdminNav } from "../../_components/admin-nav";
import { useAdminPermissions } from "../../_components/admin-shell";

type Role = { id: string; code: string; name: string };
type Staff = {
  id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
};

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const permissions = useAdminPermissions();
  const canUpdate = hasAnyPermission(permissions, ["staff.update"]);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [password, setPassword] = useState("");
  const [roleCodes, setRoleCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const [staffRes, rolesRes] = await Promise.all([
      fetch(`/api/admin/staff/${id}`),
      fetch("/api/admin/roles"),
    ]);
    const staffJson = await staffRes.json();
    const rolesJson = await rolesRes.json();
    if (!staffJson.success) {
      setError(staffJson.error?.message ?? "Failed to load");
      return;
    }
    const s = staffJson.data.staff as Staff;
    setStaff(s);
    setName(s.name);
    setStatus(s.status);
    setRoleCodes(s.roles);
    if (rolesJson.success) setRoles(rolesJson.data.items);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggleRole(code: string) {
    setRoleCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canUpdate) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, unknown> = { name, status, roleCodes };
      if (password) body.password = password;
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Update failed");
        return;
      }
      setPassword("");
      setMessage("Saved");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!staff && !error) {
    return (
      <main className="w-full text-[var(--sp-muted)]">
        Loading…
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col gap-4">
      <h1 className="text-3xl font-semibold">{staff?.email ?? "Staff"}</h1>
      <AdminNav />
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      {staff ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-slate-400">
            Name
            <input
              className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
              value={name}
              disabled={!canUpdate}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-400">
            Status
            <select
              className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
              value={status}
              disabled={!canUpdate}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </label>
          {canUpdate ? (
            <label className="text-sm text-slate-400">
              New password (optional)
              <input
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
                type="password"
                minLength={7}
                placeholder="Min 7 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          ) : null}
          <fieldset className="rounded border border-slate-800 p-3">
            <legend className="px-1 text-sm text-slate-400">Roles</legend>
            <div className="flex flex-col gap-2">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!canUpdate}
                    checked={roleCodes.includes(r.code)}
                    onChange={() => toggleRole(r.code)}
                  />
                  {r.code} — {r.name}
                </label>
              ))}
            </div>
          </fieldset>
          {canUpdate ? (
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-emerald-700 px-4 py-2"
            >
              {loading ? "Saving…" : "Save"}
            </button>
          ) : null}
        </form>
      ) : null}
    </main>
  );
}
