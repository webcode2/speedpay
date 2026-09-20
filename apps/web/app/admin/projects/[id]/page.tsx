"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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
    setMessage(`Marked ${action}`);
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
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <p className="text-slate-400">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <Link className="text-sm text-emerald-400" href="/admin/projects">
        ← Projects
      </Link>
      <h1 className="text-3xl font-semibold">{project.name}</h1>
      <p className="text-slate-400">Status: {project.status}</p>

      <form onSubmit={save} className="flex flex-col gap-3">
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="min-h-24 rounded border border-slate-600 bg-slate-900 px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2"
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <button
          type="submit"
          className="w-fit rounded bg-slate-100 px-4 py-2 text-slate-950"
        >
          Save
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(["publish", "pause", "resume", "complete", "archive"] as const).map(
          (action) => (
            <button
              key={action}
              type="button"
              className="rounded bg-emerald-500/90 px-3 py-2 text-sm text-slate-950"
              onClick={() => void act(action)}
            >
              {action}
            </button>
          ),
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Uploads</h2>
        <label className="text-sm text-slate-400">
          Image{" "}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload("IMAGE", f);
            }}
          />
        </label>
        <label className="text-sm text-slate-400">
          Document{" "}
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload("DOCUMENT", f);
            }}
          />
        </label>
        <ul className="space-y-1 text-sm">
          {documents.map((d) => (
            <li key={d.id}>
              {d.kind}:{" "}
              <a
                className="text-emerald-400"
                href={`/api/admin/projects/${project.id}/documents/${d.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {d.fileName}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {error ? <p className="text-red-400">{error}</p> : null}
      {message ? <p className="text-emerald-400">{message}</p> : null}
    </main>
  );
}
