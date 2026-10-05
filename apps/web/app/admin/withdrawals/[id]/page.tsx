"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AdminCard,
  AdminPageHeader,
  StatusPill,
} from "../../_components/ui";
import { useAdminPermissions } from "../../_components/admin-shell";
import { hasAnyPermission } from "@/permissions/visibility";

type Detail = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  rejectionReason: string | null;
  userEmail: string;
  userStatus: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  createdAt: string;
  reviewedAt: string | null;
  processedAt: string | null;
};

export default function AdminWithdrawalDetailPage() {
  const params = useParams<{ id: string }>();
  const permissions = useAdminPermissions();

  const canApprove = hasAnyPermission(permissions, ["withdrawals.approve"]);
  const canReject = hasAnyPermission(permissions, ["withdrawals.reject"]);
  const canProcess = hasAnyPermission(permissions, ["withdrawals.process"]);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [reason, setReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/admin/withdrawals/${params.id}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load withdrawal details");
        return;
      }
      setDetail(json.data.withdrawal);
    } catch {
      setError("Network error loading withdrawal details");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleAction(action: "approve" | "reject" | "process") {
    if (action === "reject" && !reason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/withdrawals/${params.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "reject" ? JSON.stringify({ reason: reason.trim() }) : undefined,
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message ?? `Action ${action} failed`);
        return;
      }

      setMessage(`Withdrawal successfully ${action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "PROCESSED"}.`);
      setShowRejectBox(false);
      setReason("");
      await load();
    } catch {
      setError("Network error submitting action.");
    } finally {
      setLoading(false);
    }
  }

  if (!detail) {
    return (
      <div className="w-full">
        <p className="text-[var(--sp-muted)]">{error ?? "Loading withdrawal details…"}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--sp-muted)]">
        <Link className="hover:text-[var(--sp-navy)] font-semibold flex items-center gap-1" href="/admin/withdrawals">
          ← Back to Withdrawals Queue
        </Link>
      </div>

      <AdminPageHeader
        title={`Withdrawal Review · ₦${Number(detail.amount).toLocaleString()}`}
        subtitle={`Request ID: ${detail.id}`}
        actions={<StatusPill status={detail.status} />}
      />

      {error ? (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          ✓ {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payout & Amount Card */}
        <AdminCard>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sp-navy)] mb-4">
            Payout Details
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-[var(--sp-muted)]">Requested Amount</span>
              <div className="text-xl font-bold font-mono text-emerald-700">
                ₦{Number(detail.amount).toLocaleString()} {detail.currency}
              </div>
            </div>

            <div>
              <span className="text-xs text-[var(--sp-muted)]">Bank Name</span>
              <div className="font-semibold text-[var(--sp-navy)]">{detail.bankName}</div>
            </div>

            <div>
              <span className="text-xs text-[var(--sp-muted)]">Account Number</span>
              <div className="font-mono font-bold text-[var(--sp-navy)]">{detail.accountNumber}</div>
            </div>

            <div>
              <span className="text-xs text-[var(--sp-muted)]">Account Name</span>
              <div className="font-semibold text-[var(--sp-navy)]">{detail.accountName}</div>
            </div>
          </div>
        </AdminCard>

        {/* User Account & Timeline Card */}
        <AdminCard>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sp-navy)] mb-4">
            Investor Account & Timeline
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-[var(--sp-muted)]">User Email</span>
              <div className="font-semibold text-[var(--sp-navy)]">{detail.userEmail}</div>
            </div>

            <div>
              <span className="text-xs text-[var(--sp-muted)]">Account KYC Status</span>
              <div>
                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-[var(--sp-surface)] text-[var(--sp-navy)]">
                  {detail.userStatus}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs text-[var(--sp-muted)]">Created At</span>
              <div className="text-xs text-[var(--sp-muted)]">
                {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "—"}
              </div>
            </div>

            {detail.reviewedAt && (
              <div>
                <span className="text-xs text-[var(--sp-muted)]">Reviewed At</span>
                <div className="text-xs text-[var(--sp-muted)]">
                  {new Date(detail.reviewedAt).toLocaleString()}
                </div>
              </div>
            )}

            {detail.processedAt && (
              <div>
                <span className="text-xs text-[var(--sp-muted)]">Processed At</span>
                <div className="text-xs text-[var(--sp-muted)]">
                  {new Date(detail.processedAt).toLocaleString()}
                </div>
              </div>
            )}

            {detail.rejectionReason && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <strong>Rejection Reason:</strong> {detail.rejectionReason}
              </div>
            )}
          </div>
        </AdminCard>
      </div>

      {/* Action Controls */}
      <AdminCard>
        <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--sp-navy)] mb-3">
          Admin Decision & Actions
        </h3>

        {detail.status === "PENDING" && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--sp-muted)]">
              This withdrawal request is currently <strong>PENDING</strong> admin approval. You can approve it to queue for settlement or reject it to refund the balance back to the user.
            </p>

            {showRejectBox && (
              <div className="space-y-2 p-4 rounded-xl bg-[var(--sp-surface)] border border-[var(--sp-border)]">
                <label className="block text-xs font-semibold text-[var(--sp-navy)]">
                  Rejection Reason (will be communicated to user and balance refunded):
                </label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Invalid bank account name, compliance check required"
                  className="w-full p-2.5 rounded-xl border border-[var(--sp-border)] text-xs text-[var(--sp-navy)] outline-none focus:ring-2 focus:ring-[var(--sp-lime-deep)]"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(false)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--sp-border)] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading || !reason.trim()}
                    onClick={() => void handleAction("reject")}
                    className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm Rejection & Refund
                  </button>
                </div>
              </div>
            )}

            {!showRejectBox && (
              <div className="flex flex-wrap gap-3">
                {canApprove && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleAction("approve")}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "✓ Approve Withdrawal"}
                  </button>
                )}

                {canReject && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowRejectBox(true)}
                    className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-bold transition"
                  >
                    ✕ Reject Withdrawal
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {detail.status === "APPROVED" && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--sp-muted)]">
              This withdrawal has been <strong>APPROVED</strong>. You can now execute and complete the bank disbursement payout.
            </p>

            {canProcess && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleAction("process")}
                className="px-5 py-2.5 rounded-xl bg-[var(--sp-navy)] hover:bg-[var(--sp-navy)]/90 text-white text-sm font-bold shadow-sm transition disabled:opacity-50"
              >
                {loading ? "Processing..." : "🚀 Process & Mark COMPLETED"}
              </button>
            )}
          </div>
        )}

        {detail.status === "COMPLETED" && (
          <div className="text-xs text-emerald-800 font-semibold p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            ✓ This withdrawal has been fully processed and completed.
          </div>
        )}

        {detail.status === "REJECTED" && (
          <div className="text-xs text-red-800 font-semibold p-3 rounded-xl bg-red-50 border border-red-200">
            ✕ This withdrawal was rejected and user funds were refunded to their wallet.
          </div>
        )}
      </AdminCard>
    </div>
  );
}
