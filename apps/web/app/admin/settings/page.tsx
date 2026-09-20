"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminNav } from "../_components/admin-nav";
import { useAdminPermissions } from "../_components/admin-shell";
import { hasAnyPermission } from "@/permissions/visibility";

type Item = { key: string; value: string; group: string };

const GROUP_LABELS: Record<string, string> = {
  app: "App",
  investment: "Investment",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  returns: "Returns",
  security: "Security",
  notification: "Notification",
};

export default function AdminSettingsPage() {
  const permissions = useAdminPermissions();
  const canUpdate = hasAnyPermission(permissions, ["settings.update"]);
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/settings");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    const list = json.data.items as Item[];
    setItems(list);
    setDraft(Object.fromEntries(list.map((i) => [i.key, i.value])));
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [items]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canUpdate) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const updates: Record<string, string> = {};
      for (const item of items) {
        if (draft[item.key] !== item.value) {
          updates[item.key] = draft[item.key] ?? item.value;
        }
      }
      if (Object.keys(updates).length === 0) {
        setMessage("No changes");
        return;
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Save failed");
        return;
      }
      setMessage("Settings saved");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold">System settings</h1>
      <AdminNav />
      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {groups.map(([group, list]) => (
          <fieldset
            key={group}
            className="rounded border border-slate-800 p-4"
          >
            <legend className="px-1 text-sm font-medium text-slate-300">
              {GROUP_LABELS[group] ?? group}
            </legend>
            <div className="flex flex-col gap-3">
              {list.map((item) => (
                <label key={item.key} className="text-sm">
                  <span className="font-mono text-emerald-300">{item.key}</span>
                  <input
                    className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
                    value={draft[item.key] ?? ""}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [item.key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        {canUpdate ? (
          <button
            type="submit"
            disabled={loading}
            className="w-fit rounded bg-emerald-700 px-4 py-2"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        ) : (
          <p className="text-sm text-slate-500">Read-only (missing settings.update)</p>
        )}
      </form>
    </main>
  );
}
