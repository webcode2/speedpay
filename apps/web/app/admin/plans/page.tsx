"use client";

import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import {
  fromDurationDays,
  toDurationDays,
  type DurationUnit,
} from "@/lib/plan-term";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  StatusPill,
} from "../_components/ui";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  price: number;
  dailyRoi: number;
  termRoi?: number;
  durationDays: number;
  dailyTaskLimit: number;
  taskReward: number;
  sortOrder: number;
  dailyProfit: number;
  bannerImage: string | null;
  subscribers?: number;
  activeSubscribers?: number;
};

type FormState = {
  name: string;
  description: string;
  price: string;
  durationValue: string;
  durationUnit: DurationUnit;
  dailyTaskLimit: string;
  taskReward: string;
  sortOrder: string;
  bannerImage: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  durationValue: "30",
  durationUnit: "days",
  dailyTaskLimit: "1",
  taskReward: "400",
  sortOrder: "0",
  bannerImage: "",
};

function toForm(plan: Plan): FormState {
  const term = fromDurationDays(plan.durationDays || 1);
  return {
    name: plan.name,
    description: plan.description ?? "",
    price: String(plan.price),
    durationValue: String(term.value),
    durationUnit: term.unit,
    dailyTaskLimit: String(plan.dailyTaskLimit),
    taskReward: String(plan.taskReward),
    sortOrder: String(plan.sortOrder),
    bannerImage: plan.bannerImage ?? "",
  };
}

function parseBody(form: FormState) {
  const durationDays = toDurationDays(
    Number(form.durationValue),
    form.durationUnit,
  );
  return {
    name: form.name,
    description: form.description.trim() || null,
    bannerImage: form.bannerImage.trim() || null,
    price: Number(form.price),
    termRoi: 0,
    dailyRoi: 0,
    durationDays,
    dailyTaskLimit: Number(form.dailyTaskLimit),
    taskReward: Number(form.taskReward),
    sortOrder: Number(form.sortOrder || 0),
  };
}

export default function AdminInvestmentsPage() {
  const [items, setItems] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = items.find((p) => p.id === selectedId) ?? null;
  const dailyEarnings =
    Number(form.dailyTaskLimit || 0) * Number(form.taskReward || 0);

  async function load() {
    const res = await fetch("/api/admin/plans");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load packages");
      return;
    }
    setItems(json.data.items);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  function startCreate() {
    setSelectedId(null);
    setForm(emptyForm);
    setError(null);
  }

  function openPlan(plan: Plan) {
    setSelectedId(plan.id);
    setForm(toForm(plan));
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = parseBody(form);
      const res = await fetch(
        selectedId ? `/api/admin/plans/${selectedId}` : "/api/admin/plans",
        {
          method: selectedId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Save failed");
        return;
      }
      await load();
      const plan = json.data.plan as Plan;
      setSelectedId(plan.id);
      setForm(toForm(plan));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function action(path: string, method = "POST") {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/plans/${selectedId}${path}`, { method });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Action failed");
        return;
      }
      await load();
      if (method === "DELETE") {
        startCreate();
        return;
      }
      const plan = json.data.plan as Plan;
      setForm(toForm(plan));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Subscription Packages"
        subtitle="Subscription-based packages. Users purchase packages to unlock daily tasks with specific reward amounts."
        actions={
          <button
            type="button"
            className="rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-sm font-semibold text-white"
            onClick={startCreate}
          >
            New package
          </button>
        }
      />
      {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <AdminCard className="min-w-0 flex-1 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--sp-border)] bg-[var(--sp-surface)] text-xs uppercase tracking-wide text-[var(--sp-muted)]">
                <tr>
                  {["Package", "Price", /* "Validity", */ "Daily Tasks", "Pay / Task", "Daily Earnings", "Status"].map((c) => (
                    <th key={c} className="px-4 py-3 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sp-border)]">
                {items.map((plan) => (
                  <tr
                    key={plan.id}
                    className={`cursor-pointer hover:bg-[var(--sp-surface)]/70 ${
                      selectedId === plan.id ? "bg-[var(--sp-lime-mint)]/40" : ""
                    }`}
                    onClick={() => openPlan(plan)}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
                      {plan.name}
                    </td>
                    <td className="px-4 py-3 font-semibold">₦{formatAmount(plan.price)}</td>
                    {/* <td className="px-4 py-3">
                      {formatDuration(plan.durationDays || 1)}
                    </td> */}
                    <td className="px-4 py-3">{plan.dailyTaskLimit} task(s)/day</td>
                    <td className="px-4 py-3">
                      ₦{formatAmount(plan.taskReward)}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--sp-lime-deep)]">
                      ₦{formatAmount(plan.dailyTaskLimit * plan.taskReward)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={plan.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--sp-muted)]">
              No subscription packages yet.
            </p>
          ) : null}
        </AdminCard>

        <AdminCard className="w-full shrink-0 lg:sticky lg:top-0 lg:w-[38%] lg:min-w-[16rem] lg:max-w-sm lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--sp-navy)]">
              {selected ? "Edit package" : "New package"}
            </h2>
            {selected && (
              <span className="text-xs text-[var(--sp-muted)]">
                ID: {selected.id.slice(0, 8)}…
              </span>
            )}
          </div>
          {selected && (
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-[var(--sp-surface)] p-2.5 text-xs">
              <div>
                <span className="block text-[var(--sp-muted)]">Active subscribers</span>
                <span className="text-sm font-bold text-[var(--sp-lime-deep)]">
                  {selected.activeSubscribers ?? 0}
                </span>
              </div>
              <div className="border-l border-[var(--sp-border)] pl-2.5">
                <span className="block text-[var(--sp-muted)]">Total subscriptions</span>
                <span className="text-sm font-bold text-[var(--sp-navy)]">
                  {selected.subscribers ?? 0}
                </span>
              </div>
            </div>
          )}
          <div className="grid gap-3">
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="text-[var(--sp-muted)]">Package Name</span>
              <AdminInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="12k"
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="text-[var(--sp-muted)]">Subscription Price (₦)</span>
              <AdminInput
                type="number"
                min={1}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            {/* Suppressed durationDays input for indefinite subscription
            <div className="grid grid-cols-2 gap-3">
              <label className="grid min-w-0 gap-1 text-sm">
                <span className="text-[var(--sp-muted)]">Validity</span>
                <AdminInput
                  type="number"
                  min={1}
                  value={form.durationValue}
                  onChange={(e) =>
                    setForm({ ...form, durationValue: e.target.value })
                  }
                />
              </label>
              <label className="grid min-w-0 gap-1 text-sm">
                <span className="text-[var(--sp-muted)]">Unit</span>
                <AdminSelect
                  value={form.durationUnit}
                  onChange={(unit) =>
                    setForm({
                      ...form,
                      durationUnit: unit as DurationUnit,
                    })
                  }
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </AdminSelect>
              </label>
            </div>
            */}
            <div className="grid grid-cols-2 gap-3">
              <label className="grid min-w-0 gap-1 text-sm">
                <span className="text-[var(--sp-muted)]">Daily Tasks Quota</span>
                <AdminInput
                  type="number"
                  min={1}
                  value={form.dailyTaskLimit}
                  onChange={(e) =>
                    setForm({ ...form, dailyTaskLimit: e.target.value })
                  }
                />
              </label>
              <label className="grid min-w-0 gap-1 text-sm">
                <span className="text-[var(--sp-muted)]">Pay per task (₦)</span>
                <AdminInput
                  type="number"
                  min={0}
                  value={form.taskReward}
                  onChange={(e) => setForm({ ...form, taskReward: e.target.value })}
                />
              </label>
            </div>
            <div className="rounded-xl bg-[var(--sp-surface)] p-3 text-sm">
              <div className="flex items-center justify-between font-semibold text-[var(--sp-navy)]">
                <span>Daily Earnings:</span>
                <span className="text-[var(--sp-lime-deep)]">₦{formatAmount(dailyEarnings)} / day</span>
              </div>
              <p className="mt-1 text-xs text-[var(--sp-muted)]">
                Subscribers complete up to {form.dailyTaskLimit || 0} tasks/day at ₦{formatAmount(Number(form.taskReward || 0))} each.
              </p>
            </div>
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="text-[var(--sp-muted)]">Description</span>
              <textarea
                className="min-h-20 w-full min-w-0 rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] outline-none ring-[var(--sp-lime)] focus:ring-2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="grid min-w-0 gap-1 text-sm">
              <span className="text-[var(--sp-muted)]">Sort order</span>
              <AdminInput
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="rounded-xl bg-[var(--sp-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {selected ? "Save changes" : "Create package"}
              </button>
              {selected && selected.status !== "OPEN" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void action("/activate")}
                  className="rounded-xl border border-[var(--sp-border)] px-4 py-2 text-sm font-semibold text-[var(--sp-navy)] disabled:opacity-50"
                >
                  Open
                </button>
              ) : null}
              {selected?.status === "OPEN" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void action("/pause")}
                  className="rounded-xl border border-[var(--sp-border)] px-4 py-2 text-sm font-semibold text-[var(--sp-navy)] disabled:opacity-50"
                >
                  Pause
                </button>
              ) : null}
              {selected ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`Delete ${selected.name}?`)) void action("", "DELETE");
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--sp-danger)] disabled:opacity-50"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
