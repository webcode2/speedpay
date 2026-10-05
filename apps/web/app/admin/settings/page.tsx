"use client";

import { useEffect, useMemo, useState } from "react";
import { SETTINGS_CATALOG } from "@/settings/catalog";
import { hasAnyPermission } from "@/permissions/visibility";
import { useAdminPermissions } from "../_components/admin-shell";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
} from "../_components/ui";

type Item = { key: string; value: string; group: string };

const GROUP_LABELS: Record<string, string> = {
  app: "App",
  investment: "Packages",
  referral: "Referral Commissions (%)",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  security: "Security",
  notification: "Notification",
};

const GROUP_ORDER = [
  "app",
  "investment",
  "referral",
  "deposit",
  "withdrawal",
  "security",
  "notification",
];

export default function AdminSettingsPage() {
  const permissions = useAdminPermissions();
  const canUpdate = hasAnyPermission(permissions, ["settings.update"]);
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
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
    return GROUP_ORDER.filter((g) => map.has(g)).map(
      (g) => [g, map.get(g)!] as const,
    );
  }, [items]);

  async function saveGroup(group: string) {
    if (!canUpdate) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const groupKeys = new Set(
        SETTINGS_CATALOG.filter((c) => c.group === group).map((c) => c.key),
      );
      const updates: Record<string, string> = {};
      for (const item of items) {
        if (!groupKeys.has(item.key)) continue;
        if (draft[item.key] !== item.value) {
          updates[item.key] = draft[item.key] ?? item.value;
        }
      }
      if (Object.keys(updates).length === 0) {
        setMessage("No changes");
        setEditingGroup(null);
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
      setEditingGroup(null);
      await load();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function cancelGroup(group: string) {
    const next = { ...draft };
    for (const item of items) {
      if (item.group === group) next[item.key] = item.value;
    }
    setDraft(next);
    setEditingGroup(null);
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        title="System settings"
        subtitle="View platform configuration — edit one group at a time"
      />
      {error ? <p className="mb-3 text-[var(--sp-danger)]">{error}</p> : null}
      {message ? (
        <p className="mb-3 text-[var(--sp-lime-deep)]">{message}</p>
      ) : null}

      {/* Withdrawal Gateway Switch Card */}
      {canUpdate && (
        <div className="mb-6 rounded-2xl border-2 border-[var(--sp-border)] bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-[var(--sp-navy)]">
                  Withdrawal Gateway Switch
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${
                    items.find((i) => i.key === "withdrawal.enabled")?.value === "false"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {items.find((i) => i.key === "withdrawal.enabled")?.value === "false"
                    ? "DISABLED (Server Overload Mode)"
                    : "ACTIVE (Normal Operations)"}
                </span>
              </div>
              <p className="text-xs text-[var(--sp-muted)]">
                {items.find((i) => i.key === "withdrawal.enabled")?.value === "false"
                  ? "Withdrawals are currently disabled. Users attempting to withdraw will see: \"Server overload wait for a few moment\"."
                  : "Withdrawals are currently active. Verified users can request payouts according to standard platform limits."}
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                const current = items.find((i) => i.key === "withdrawal.enabled")?.value ?? "true";
                const nextVal = current === "false" ? "true" : "false";
                setLoading(true);
                setError(null);
                setMessage(null);
                try {
                  const res = await fetch("/api/admin/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      updates: { "withdrawal.enabled": nextVal },
                    }),
                  });
                  const json = await res.json();
                  if (!json.success) {
                    setError(json.error?.message ?? "Failed to toggle withdrawal status.");
                    return;
                  }
                  setMessage(
                    nextVal === "true"
                      ? "Withdrawals are now ACTIVE."
                      : "Withdrawals are now DISABLED (Server overload mode).",
                  );
                  await load();
                } catch {
                  setError("Network error toggling withdrawal status.");
                } finally {
                  setLoading(false);
                }
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-sm whitespace-nowrap ${
                items.find((i) => i.key === "withdrawal.enabled")?.value === "false"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {items.find((i) => i.key === "withdrawal.enabled")?.value === "false"
                ? "✓ Enable Withdrawals (Set Active)"
                : "⛔ Disable Withdrawals (Set Server Overload)"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(([group, list]) => {
          const editing = editingGroup === group;
          return (
            <AdminCard key={group}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--sp-navy)]">
                  {GROUP_LABELS[group] ?? group}
                </h2>
                {canUpdate && !editing ? (
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--sp-border)] px-3 py-1.5 text-sm font-semibold text-[var(--sp-navy)] hover:bg-[var(--sp-lime-mint)]"
                    onClick={() => setEditingGroup(group)}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                {list.map((item) =>
                  editing ? (
                    <label key={item.key} className="text-sm">
                      <span className="font-mono text-xs font-semibold text-[var(--sp-lime-deep)]">
                        {item.key}
                      </span>
                      {item.key.endsWith(".enabled") ? (
                        <select
                          className="mt-1 w-full rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sp-lime-deep)]"
                          value={draft[item.key] ?? "true"}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              [item.key]: e.target.value,
                            }))
                          }
                        >
                          <option value="true">true (Active / Enabled)</option>
                          <option value="false">false (Disabled / Inactive)</option>
                        </select>
                      ) : (
                        <AdminInput
                          className="mt-1 w-full"
                          value={draft[item.key] ?? ""}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              [item.key]: e.target.value,
                            }))
                          }
                        />
                      )}
                    </label>
                  ) : (
                    <div key={item.key} className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-[var(--sp-muted)]">
                        {item.key}
                      </span>
                      <span className="text-sm font-medium text-[var(--sp-navy)]">
                        {item.key.endsWith(".enabled") ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                              item.value === "true"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.value === "true" ? "ACTIVE (true)" : "DISABLED (false)"}
                          </span>
                        ) : (
                          item.value
                        )}
                      </span>
                    </div>
                  ),
                )}
              </div>
              {editing ? (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    className="rounded-xl bg-[var(--sp-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => void saveGroup(group)}
                  >
                    {loading ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--sp-border)] px-4 py-2 text-sm font-semibold text-[var(--sp-muted)]"
                    onClick={() => cancelGroup(group)}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}
