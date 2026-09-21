"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNav } from "../../_components/admin-nav";

type Role = { id: string; code: string; name: string };

export default function NewStaffPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roleCodes, setRoleCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/roles");
      const json = await res.json();
      if (json.success) setRoles(json.data.items);
    })();
  }, []);

  function toggleRole(code: string) {
    setRoleCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, roleCodes }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Create failed");
        return;
      }
      router.push(`/admin/staff/${json.data.staff.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex w-full flex-col gap-4">
      <h1 className="text-3xl font-semibold">New staff</h1>
      <AdminNav />
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Password (min 8)"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <fieldset className="rounded border border-slate-800 p-3">
          <legend className="px-1 text-sm text-slate-400">Roles</legend>
          <div className="flex flex-col gap-2">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={roleCodes.includes(r.code)}
                  onChange={() => toggleRole(r.code)}
                />
                {r.code} — {r.name}
              </label>
            ))}
          </div>
        </fieldset>
        {error ? <p className="text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-emerald-700 px-4 py-2"
        >
          {loading ? "Creating…" : "Create"}
        </button>
      </form>
    </main>
  );
}
