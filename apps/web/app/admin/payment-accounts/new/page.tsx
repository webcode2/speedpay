"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
} from "../_components/ui";

export default function AdminNewPaymentAccountPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "BANK",
    label: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    provider: "",
    notes: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/payment-accounts", {
      method: "POST",
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
      setError(json.error?.message ?? "Create failed");
      return;
    }
    router.push(`/admin/payment-accounts/${json.data.account.id}`);
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
        title="New payment account"
        subtitle="Starts disabled until you publish it"
      />
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
            <span className="font-medium text-[var(--sp-navy)]">
              Account / wallet number
            </span>
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
            <span className="font-medium text-[var(--sp-navy)]">
              Provider / network
            </span>
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
          <button
            type="submit"
            className="rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Create account
          </button>
        </AdminCard>
      </form>
    </div>
  );
}
