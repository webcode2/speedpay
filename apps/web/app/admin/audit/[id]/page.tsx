"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNav } from "../../_components/admin-nav";

type Log = {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export default function AdminAuditDetailPage() {
  const params = useParams<{ id: string }>();
  const [log, setLog] = useState<Log | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/audit/${params.id}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setLog(json.data.log);
    })();
  }, [params.id]);

  if (!log) {
    return (
      <main className="flex w-full items-center">
        <p className="text-slate-400">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col gap-4">
      <Link className="text-sm text-emerald-400" href="/admin/audit">
        ← Audit
      </Link>
      <AdminNav />
      <h1 className="text-3xl font-semibold">{log.action}</h1>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">When</dt>
          <dd>{log.createdAt}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Actor</dt>
          <dd>
            {log.actorType} {log.actorId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Entity</dt>
          <dd>
            {log.entityType} / {log.entityId}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Reason</dt>
          <dd>{log.reason ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">IP / UA</dt>
          <dd>
            {log.ipAddress ?? "—"}
            <br />
            <span className="text-slate-500">{log.userAgent ?? "—"}</span>
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Before</dt>
          <dd>
            <pre className="overflow-x-auto rounded border border-slate-800 bg-slate-950 p-3 text-xs">
              {JSON.stringify(log.before, null, 2)}
            </pre>
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">After</dt>
          <dd>
            <pre className="overflow-x-auto rounded border border-slate-800 bg-slate-950 p-3 text-xs">
              {JSON.stringify(log.after, null, 2)}
            </pre>
          </dd>
        </div>
      </dl>
    </main>
  );
}
