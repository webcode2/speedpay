"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNav } from "../../_components/admin-nav";

type Detail = {
  id: string;
  status: string;
  principal: number;
  lotCount: number;
  userEmail: string;
  packageName: string;
  projectName: string;
  startAt: string;
  maturityAt: string;
  returnType: string;
  returnRate: string;
  parentInvestmentId: string | null;
};

export default function AdminInvestmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/investments/${params.id}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setDetail(json.data.investment);
    })();
  }, [params.id]);

  if (!detail) {
    return (
      <main className="flex w-full items-center">
        <p className="text-slate-400">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col gap-4">
      <Link className="text-sm text-emerald-400" href="/admin/investments">
        ← Investments
      </Link>
      <AdminNav />
      <h1 className="text-3xl font-semibold">{detail.packageName}</h1>
      <p className="text-slate-400">
        {detail.userEmail} · {detail.status}
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Project</dt>
          <dd>{detail.projectName}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Principal / lots</dt>
          <dd>
            {detail.principal} / {detail.lotCount}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Return</dt>
          <dd>
            {detail.returnType} {detail.returnRate}%
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Term</dt>
          <dd>
            {detail.startAt} → {detail.maturityAt}
          </dd>
        </div>
        {detail.parentInvestmentId ? (
          <div>
            <dt className="text-slate-500">Parent investment</dt>
            <dd>
              <Link
                className="text-emerald-400"
                href={`/admin/investments/${detail.parentInvestmentId}`}
              >
                {detail.parentInvestmentId}
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>
    </main>
  );
}
