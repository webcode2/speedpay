"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import { InvestorPage } from "../../_components/investor-page";

type Investment = {
  id: string;
  status: string;
  principal: number;
  lotCount: number;
  returnRate: string;
  packageName: string;
  projectName: string;
  startAt: string;
  maturityAt: string;
  expectedReturn: number;
  accruedReturn: number;
  currentValue: number;
  maturityValue: number;
  percentageComplete: number;
};

type SeriesPoint = { at: string; accruedReturn: number; currentValue: number };

export default function InvestmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<Investment | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [invRes, retRes] = await Promise.all([
        fetch(`/api/investments/${id}`),
        fetch(`/api/investments/${id}/returns`),
      ]);
      const invJson = await invRes.json();
      const retJson = await retRes.json();
      if (!invJson.success) {
        setError(invJson.error?.message ?? "Failed to load");
        return;
      }
      setInv(invJson.data.investment);
      if (retJson.success) {
        const returns = retJson.data.returns;
        setSeries(returns?.series ?? []);
        if (returns && invJson.data.investment) {
          setInv({
            ...invJson.data.investment,
            accruedReturn: returns.accruedReturn ?? invJson.data.investment.accruedReturn,
            currentValue: returns.currentValue ?? invJson.data.investment.currentValue,
            expectedReturn:
              returns.expectedReturn ?? invJson.data.investment.expectedReturn,
            maturityValue:
              returns.maturityValue ?? invJson.data.investment.maturityValue,
            percentageComplete:
              returns.percentageComplete ??
              invJson.data.investment.percentageComplete,
          });
        }
      }
    })();
  }, [id]);

  return (
    <InvestorPage title="Investment">
      <Link className="text-sm text-emerald-400" href="/investments">
        ← Investments
      </Link>
      {error ? <p className="text-red-400">{error}</p> : null}
      {inv ? (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-slate-400">Package</dt>
            <dd>
              {inv.packageName} ({inv.projectName})
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Status</dt>
            <dd>{inv.status}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Principal</dt>
            <dd>
              {formatAmount(inv.principal)} · {inv.lotCount} lots ·{" "}
              {inv.returnRate}%
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Returns</dt>
            <dd>
              Accrued {formatAmount(inv.accruedReturn)} · Current{" "}
              {formatAmount(inv.currentValue)} · Expected{" "}
              {formatAmount(inv.expectedReturn)} · Maturity{" "}
              {formatAmount(inv.maturityValue)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Timeline</dt>
            <dd>
              {new Date(inv.startAt).toLocaleDateString()} →{" "}
              {new Date(inv.maturityAt).toLocaleDateString()} (
              {Math.round(inv.percentageComplete)}%)
            </dd>
          </div>
          {series.length > 0 ? (
            <div>
              <dt className="text-slate-400">Series points</dt>
              <dd className="max-h-40 overflow-auto text-xs text-slate-500">
                {series.map((p) => (
                  <div key={p.at}>
                    {new Date(p.at).toLocaleDateString()}: accrued{" "}
                    {formatAmount(p.accruedReturn)}
                  </div>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        !error && <p className="text-slate-400">Loading…</p>
      )}
    </InvestorPage>
  );
}
