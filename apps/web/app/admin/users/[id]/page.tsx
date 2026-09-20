"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNav } from "../../_components/admin-nav";

type Detail = {
  id: string;
  email: string;
  status: string;
  investmentCount: number;
  payoutAccountCount: number;
  latestKyc: { id: string; status: string } | null;
  profile: { firstName: string | null; lastName: string | null } | null;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/users/${params.id}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load");
        return;
      }
      setDetail(json.data.user);
    })();
  }, [params.id]);

  if (!detail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <p className="text-slate-400">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-10">
      <Link className="text-sm text-emerald-400" href="/admin/users">
        ← Users
      </Link>
      <AdminNav />
      <h1 className="text-3xl font-semibold">{detail.email}</h1>
      <p className="text-slate-400">Status: {detail.status}</p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Name</dt>
          <dd>
            {detail.profile?.firstName ?? "—"} {detail.profile?.lastName ?? ""}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Investments</dt>
          <dd>{detail.investmentCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Payout accounts</dt>
          <dd>{detail.payoutAccountCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Latest KYC</dt>
          <dd>
            {detail.latestKyc ? (
              <Link
                className="text-emerald-400"
                href={`/admin/kyc/${detail.latestKyc.id}`}
              >
                {detail.latestKyc.status}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </main>
  );
}
