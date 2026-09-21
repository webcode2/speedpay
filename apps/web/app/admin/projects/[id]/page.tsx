"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  StatusPill,
} from "../../_components/ui";

type Project = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: string | null;
  status: string;
  startDate: string | null;
  completionDate: string | null;
  image: string | null;
};

type Doc = {
  id: string;
  kind: string;
  fileName: string;
};

const ACTIONS_BY_STATUS: Record<string, string[]> = {
  DRAFT: ["publish", "archive"],
  ACTIVE: ["pause", "complete", "archive"],
  PAUSED: ["resume", "complete", "archive"],
  COMPLETED: ["resume", "archive"],
  ARCHIVED: ["resume"],
};

export default function AdminProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/projects/${params.id}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      return;
    }
    const p = json.data.project as Project;
    setProject(p);
    setDocuments(json.data.documents);
    setName(p.name);
    setDescription(p.description ?? "");
    setLocation(p.location ?? "");
    setCapacity(p.capacity ?? "");
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const actions = useMemo(
    () => (project ? ACTIONS_BY_STATUS[project.status] ?? [] : []),
    [project],
  );

  const archived = project?.status === "ARCHIVED";

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/admin/projects/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        location: location || null,
        capacity: capacity || null,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Save failed");
      return;
    }
    setMessage("Saved");
    await load();
  }

  async function act(action: string) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/projects/${params.id}/${action}`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Action failed");
      return;
    }
    setMessage(
      action === "resume" &&
        (project?.status === "ARCHIVED" || project?.status === "COMPLETED")
        ? "Reactivated — project is ACTIVE again"
        : `Marked ${action}`,
    );
    await load();
  }

  async function upload(kind: "IMAGE" | "DOCUMENT", file: File) {
    setError(null);
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const res = await fetch(`/api/admin/projects/${params.id}/documents`, {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Upload failed");
      return;
    }
    setMessage(`Uploaded ${kind}`);
    await load();
  }

  if (!project) {
    return <p className="text-[var(--sp-muted)]">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="w-full space-y-4">
      <Link
        href="/admin/projects"
        className="text-sm font-medium text-[var(--sp-lime-deep)]"
      >
        ← Projects
      </Link>
      <AdminPageHeader
        title={project.name}
        subtitle="Project details"
        actions={<StatusPill status={project.status} />}
      />

      {archived ? (
        <AdminCard>
          <p className="text-sm text-[var(--sp-muted)]">
            This project is archived and cannot be used for new packages. Click{" "}
            <strong className="text-[var(--sp-navy)]">resume</strong> to make it
            ACTIVE again.
          </p>
        </AdminCard>
      ) : null}

      <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
        <AdminCard className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Name</span>
            <AdminInput
              className="mt-1 w-full"
              value={name}
              disabled={archived}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Description</span>
            <textarea
              disabled={archived}
              className="mt-1 min-h-28 w-full rounded-xl border border-[var(--sp-border)] bg-white px-3 py-2 text-sm text-[var(--sp-navy)] outline-none ring-[var(--sp-lime)] focus:ring-2 disabled:bg-[var(--sp-surface)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </AdminCard>
        <AdminCard className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Location</span>
            <AdminInput
              className="mt-1 w-full"
              value={location}
              disabled={archived}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--sp-navy)]">Capacity</span>
            <AdminInput
              className="mt-1 w-full"
              value={capacity}
              disabled={archived}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          {!archived ? (
            <button
              type="submit"
              className="rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Save
            </button>
          ) : null}
        </AdminCard>
      </form>

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className="rounded-xl bg-[var(--sp-lime)] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void act(action)}
          >
            {action === "resume" &&
            (project.status === "ARCHIVED" || project.status === "COMPLETED")
              ? "Reactivate"
              : action}
          </button>
        ))}
      </div>

      <AdminCard className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--sp-navy)]">
          Uploads
        </h2>
        {!archived ? (
          <>
            <label className="block text-sm text-[var(--sp-muted)]">
              Image
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload("IMAGE", f);
                }}
              />
            </label>
            <label className="block text-sm text-[var(--sp-muted)]">
              Document
              <input
                type="file"
                className="mt-1 block w-full text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload("DOCUMENT", f);
                }}
              />
            </label>
          </>
        ) : null}
        <ul className="space-y-1 text-sm">
          {documents.map((d) => (
            <li key={d.id}>
              {d.kind}:{" "}
              <a
                className="font-medium text-[var(--sp-lime-deep)]"
                href={`/api/admin/projects/${project.id}/documents/${d.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {d.fileName}
              </a>
            </li>
          ))}
          {documents.length === 0 ? (
            <li className="text-[var(--sp-muted)]">No uploads yet.</li>
          ) : null}
        </ul>
      </AdminCard>

      {error ? <p className="text-[var(--sp-danger)]">{error}</p> : null}
      {message ? <p className="text-[var(--sp-lime-deep)]">{message}</p> : null}
    </div>
  );
}
