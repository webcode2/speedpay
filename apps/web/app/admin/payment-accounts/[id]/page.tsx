"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  StatusPill,
} from "../../_components/ui";

type Account = {
  id: string;
  type: string;
  label: string;
  accountName: string;
  accountNumber: string;
  bankName: string | null;
  provider: string | null;
  notes: string | null;
  status: string;
};

export default function AdminPaymentAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "BANK",
    label: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    provider: "",
    notes: "",
  });

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  async function load(accountId: string) {
    const res = await fetch(`/api/admin/payment-accounts/${accountId}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    const a = json.data.account as Account;
    setAccount(a);
    setForm({
      type: a.type,
      label: a.label,
      accountName: a.accountName,
      accountNumber: a.accountNumber,
      bankName: a.bankName ?? "",
      provider: a.provider ?? "",
      notes: a.notes ?? "",
    });
  }

  useEffect(() => {
    if (id) void load(id);
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/payment-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        label: form.label,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        bankName: form.bankName || null,
        provider: form.provider || null,
        notes: form.notes || null,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Save failed");
      return;
    }
    setMessage("Saved");
    await load(id);
  }

  async function setStatus(action: "publish" | "disable") {
    if (!id) return;
    const res = await fetch(`/api/admin/payment-accounts/${id}/${action}`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Action failed");
      return;
    }
    await load(id);
  }

  async function onDelete() {
    if (!id || !account) return;
    if (!confirm("Delete this disabled account?")) return;
    const res = await fetch(`/api/admin/payment-accounts/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Delete failed");
      return;
    }
    window.location.href = "/admin/payment-accounts";
  }

  if (!account) {
    return (
      <p className="text-[var(--sp-muted)]">{error ?? "Loading…"}</p>
    );
  }

  return (
    <div className="w-full">
      <Link
        href="/admin/payment-accounts"
        className="text-sm font-medium text-[var(--sp-lime-deep)]"
      >
        ← Payment accounts
      </Link>
      <AdminPageHeader
        title={account.label}
        subtitle={account.type}
        actions={<StatusPill status={account.status} />}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {account.status === "PUBLISHED" ? (
          <button
            type="button"
            className="rounded-xl border border-[var(--sp-border)] px-4 py-2 text-sm font-semibold text-[var(--sp-danger)]"
            onClick={() => void setStatus("disable")}
          >
            Disable
          </button>
        ) : (
          <>
            <button
              type="button"
              className="rounded-xl bg-[var(--sp-lime)] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => void setStatus("publish")}
            >
              Publish
            </button>
            <button
              type="button"
              className="rounded-xl border border-[var(--sp-border)] px-4 py-2 text-sm font-semibold text-[var(--sp-danger)]"
              onClick={() => void onDelete()}
            >
              Delete
            </button>
          </>
        )}
      </div>
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
        <AdminCard className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Type</span>
            <div className="mt-1">
              <AdminSelect
                value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <option value="BANK">BANK</option>
                <option value="MOBILE_MONEY">MOBILE_MONEY</option>
                <option value="OTHER">OTHER</option>
              </AdminSelect>
            </div>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Label</span>
            <AdminInput
              className="mt-1 w-full"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Account name</span>
            <AdminInput
              className="mt-1 w-full"
              value={form.accountName}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountName: e.target.value }))
              }
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Number</span>
            <AdminInput
              className="mt-1 w-full"
              value={form.accountNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountNumber: e.target.value }))
              }
              required
            />
          </label>
        </AdminCard>
        <AdminCard className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Bank name</span>
            <AdminInput
              className="mt-1 w-full"
              value={form.bankName}
              onChange={(e) =>
                setForm((f) => ({ ...f, bankName: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Provider</span>
            <AdminInput
              className="mt-1 w-full"
              value={form.provider}
              onChange={(e) =>
                setForm((f) => ({ ...f, provider: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Notes</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] outline-none ring-[var(--sp-lime)] focus:ring-2"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
          {message ? (
            <p className="text-[var(--sp-lime-deep)]">{message}</p>
          ) : null}
          <button
            type="submit"
            className="rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Save changes
          </button>
        </AdminCard>
      </form>
    </div>
  );
}
