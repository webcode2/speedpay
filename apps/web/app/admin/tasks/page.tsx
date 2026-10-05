"use client";

import { useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  AdminTable,
  StatusPill,
} from "../_components/ui";

const SOLAR_CATEGORIES = [
  "Solar Panels",
  "Batteries",
  "Inverters",
  "Kits",
  "Lighting",
  "Charge Controllers",
  "Accessories",
];

type Item = {
  id: string;
  title: string;
  category: string;
  description: string;
  imageKey: string;
  imageUrl: string;
  status: string;
  sortOrder: number;
  completionsToday: number;
};

type Completion = {
  id: string;
  userEmail: string;
  itemTitle: string;
  stars: number;
  rewardAmount: number;
  taskDate: string;
  createdAt: string;
};

type FormState = {
  title: string;
  category: string;
  description: string;
  imageKey: string;
  imageUrl: string;
  sortOrder: string;
};

const emptyForm: FormState = {
  title: "",
  category: "Solar Panels",
  description: "",
  imageKey: "",
  imageUrl: "",
  sortOrder: "0",
};

function toForm(item: Item): FormState {
  return {
    title: item.title,
    category: item.category,
    description: item.description,
    imageKey: item.imageKey,
    imageUrl: item.imageUrl,
    sortOrder: String(item.sortOrder),
  };
}

export default function AdminTasksPage() {
  const [tab, setTab] = useState<"products" | "completions">("products");
  const [items, setItems] = useState<Item[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  async function loadItems() {
    const res = await fetch("/api/admin/tasks/items");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load products");
      return;
    }
    setItems(json.data.items);
    setError(null);
  }

  async function loadCompletions() {
    const res = await fetch("/api/admin/tasks/completions?limit=50");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load reviews");
      return;
    }
    setCompletions(json.data.items);
    setError(null);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    if (tab === "completions") void loadCompletions();
  }, [tab]);

  function startCreate() {
    setSelectedId(null);
    setForm(emptyForm);
    setError(null);
  }

  function openItem(item: Item) {
    setSelectedId(item.id);
    setForm(toForm(item));
    setError(null);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("purpose", "task");
      const res = await fetch("/api/admin/media/image", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Upload failed");
        return;
      }
      const key = json.data.storageKey as string;
      setForm((prev) => ({
        ...prev,
        imageKey: key,
        imageUrl: `/api/media/${key}`,
      }));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: form.title,
        category: form.category,
        description: form.description,
        imageKey: form.imageKey,
        sortOrder: Number(form.sortOrder || 0),
      };
      const res = await fetch(
        selectedId
          ? `/api/admin/tasks/items/${selectedId}`
          : "/api/admin/tasks/items",
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
      await loadItems();
      const item = json.data.item as Item;
      setSelectedId(item.id);
      setForm(toForm(item));
    } finally {
      setBusy(false);
    }
  }

  async function action(path: string, method = "POST") {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tasks/items/${selectedId}${path}`, {
        method,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Action failed");
        return;
      }
      await loadItems();
      if (method === "DELETE") {
        startCreate();
        return;
      }
      const item = json.data.item as Item;
      setForm(toForm(item));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Review products"
        subtitle="Solar, batteries, and other renewable-energy products investors review"
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                tab === "products"
                  ? "bg-[var(--sp-navy)] text-white"
                  : "border border-[var(--sp-border)] text-[var(--sp-navy)]"
              }`}
              onClick={() => setTab("products")}
            >
              Products
            </button>
            <button
              type="button"
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                tab === "completions"
                  ? "bg-[var(--sp-navy)] text-white"
                  : "border border-[var(--sp-border)] text-[var(--sp-navy)]"
              }`}
              onClick={() => setTab("completions")}
            >
              Reviews
            </button>
            {tab === "products" ? (
              <button
                type="button"
                className="rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-sm font-semibold text-white"
                onClick={startCreate}
              >
                New product
              </button>
            ) : null}
          </div>
        }
      />
      {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}

      {tab === "completions" ? (
        <AdminTable
          columns={["Investor", "Product", "Stars", "Reward", "Date"]}
          empty={completions.length === 0 ? "No reviews yet." : undefined}
        >
          {completions.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-[var(--sp-navy)]">
                {row.userEmail}
              </td>
              <td className="px-4 py-3">{row.itemTitle}</td>
              <td className="px-4 py-3">{row.stars}</td>
              <td className="px-4 py-3">₦{row.rewardAmount.toLocaleString()}</td>
              <td className="px-4 py-3 text-[var(--sp-muted)]">
                {row.taskDate}
              </td>
            </tr>
          ))}
        </AdminTable>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <AdminCard className="min-w-0 flex-1 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--sp-border)] bg-[var(--sp-surface)] text-xs uppercase tracking-wide text-[var(--sp-muted)]">
                  <tr>
                    {["Product", "Category", "Today", "Status"].map((c) => (
                      <th key={c} className="px-4 py-3 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sp-border)]">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={`cursor-pointer hover:bg-[var(--sp-surface)]/70 ${
                        selectedId === item.id
                          ? "bg-[var(--sp-lime-mint)]/40"
                          : ""
                      }`}
                      onClick={() => openItem(item)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <span className="font-medium text-[var(--sp-navy)]">
                            {item.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3">{item.completionsToday}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--sp-muted)]">
                No solar products yet. Create one for investors to review.
              </p>
            ) : null}
          </AdminCard>

          <AdminCard className="w-full shrink-0 lg:w-[38%] lg:min-w-[16rem] lg:max-w-sm">
            <h2 className="mb-4 text-lg font-semibold text-[var(--sp-navy)]">
              {selected ? "Edit product" : "New product"}
            </h2>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--sp-muted)]">Title</span>
                <AdminInput
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="550W Mono solar panel"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--sp-muted)]">Category</span>
                <AdminSelect
                  value={
                    SOLAR_CATEGORIES.includes(form.category)
                      ? form.category
                      : "__custom"
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      category: value === "__custom" ? form.category : value,
                    })
                  }
                >
                  {SOLAR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__custom">Other</option>
                </AdminSelect>
                {!SOLAR_CATEGORIES.includes(form.category) ? (
                  <AdminInput
                    className="mt-2"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    placeholder="Renewable energy"
                  />
                ) : null}
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--sp-muted)]">Description</span>
                <textarea
                  className="min-h-20 rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] outline-none ring-[var(--sp-lime)] focus:ring-2"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="What should the reviewer look at?"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--sp-muted)]">Photo</span>
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="h-32 w-full rounded-xl object-cover"
                  />
                ) : null}
                <AdminInput
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                  }}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--sp-muted)]">Sort order</span>
                <AdminInput
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || uploading || !form.imageKey}
                  onClick={() => void save()}
                  className="rounded-xl bg-[var(--sp-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {selected ? "Save changes" : "Create"}
                </button>
                {selected && selected.status !== "PUBLISHED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void action("/publish")}
                    className="rounded-xl border border-[var(--sp-border)] px-4 py-2 text-sm font-semibold text-[var(--sp-navy)] disabled:opacity-50"
                  >
                    Publish
                  </button>
                ) : null}
                {selected?.status === "PUBLISHED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void action("/disable")}
                    className="rounded-xl border border-[var(--sp-border)] px-4 py-2 text-sm font-semibold text-[var(--sp-navy)] disabled:opacity-50"
                  >
                    Disable
                  </button>
                ) : null}
                {selected ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Delete ${selected.title}?`)) {
                        void action("", "DELETE");
                      }
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
      )}
    </div>
  );
}
