"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/money";
import {
  AdminCard,
  AdminPageHeader,
  StatusPill,
} from "../../_components/ui";

type DepositDetail = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerRef: string | null;
  senderTransactionId: string | null;
  senderName: string | null;
  receiptUrl: string | null;
  receiptKey: string | null;
  paymentAccountId: string | null;
  paymentAccount: {
    label: string | null;
    bankName: string | null;
    accountName: string | null;
    accountNumber: string | null;
  } | null;
  walletTransactionId: string | null;
  failureReason: string | null;
  adminNotes: string | null;
  approvedByAdminEmail: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminDepositDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [deposit, setDeposit] = useState<DepositDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Form states
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchDeposit = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deposits/${id}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load deposit.");
        return;
      }
      setDeposit(json.data.deposit);
      if (json.data.deposit.adminNotes) {
        setAdminNotes(json.data.deposit.adminNotes);
      }
    } catch {
      setError("Network error loading deposit details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDeposit();
  }, [id]);

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this deposit and credit the user's wallet?")) {
      return;
    }
    setSubmitting(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/deposits/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionMsg(`Error: ${json.error?.message ?? "Approval failed."}`);
        return;
      }
      setActionMsg("Deposit approved and wallet balance credited successfully!");
      await fetchDeposit();
    } catch {
      setActionMsg("Network error during approval.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    setSubmitting(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/deposits/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim(), adminNotes }),
      });
      const json = await res.json();
      if (!json.success) {
        setActionMsg(`Error: ${json.error?.message ?? "Rejection failed."}`);
        return;
      }
      setShowRejectModal(false);
      setActionMsg("Deposit marked as failed/rejected.");
      await fetchDeposit();
    } catch {
      setActionMsg("Network error during rejection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center gap-2 text-xs text-[var(--sp-muted)]">
        <Link href="/admin/deposits" className="hover:underline">
          ← Back to Deposits
        </Link>
      </div>

      <AdminPageHeader
        title="Deposit Review & Verification"
        subtitle={`Deposit ID: ${id}`}
      />

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      {actionMsg ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-800">
          {actionMsg}
        </div>
      ) : null}

      {loading && !deposit ? (
        <p className="text-[var(--sp-muted)]">Loading deposit…</p>
      ) : null}

      {deposit ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Details */}
          <div className="space-y-6 lg:col-span-2">
            <AdminCard className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--sp-border)] pb-4">
                <div>
                  <span className="text-xs uppercase font-semibold text-[var(--sp-muted)]">
                    Deposit Amount
                  </span>
                  <p className="text-3xl font-black text-[var(--sp-navy)]">
                    ₦{formatAmount(deposit.amount, deposit.currency)}
                  </p>
                </div>
                <div>
                  <StatusPill status={deposit.status} />
                </div>
              </div>

              {/* Transaction Verification Details */}
              <div className="mt-6 rounded-2xl bg-[var(--sp-surface)]/80 p-5 border border-[var(--sp-border)] space-y-4">
                <h3 className="text-sm font-bold text-[var(--sp-navy)] flex items-center gap-2">
                  <span>💳</span> User Payment Proof / Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[var(--sp-muted)] block">
                      Transaction ID / Session Ref (Required)
                    </span>
                    <span className="font-mono text-sm font-bold text-[var(--sp-lime-deep)] select-all">
                      {deposit.senderTransactionId || deposit.providerRef || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[var(--sp-muted)] block">
                      Sender / Depositor Name (Optional)
                    </span>
                    <span className="text-sm font-bold text-[var(--sp-navy)]">
                      {deposit.senderName || "—"}
                    </span>
                  </div>
                </div>

                {deposit.receiptUrl && (
                  <div className="pt-3 border-t border-[var(--sp-border)]">
                    <span className="text-[10px] uppercase font-semibold text-[var(--sp-muted)] block mb-2">
                      Uploaded Payment Receipt
                    </span>
                    {deposit.receiptUrl.endsWith(".pdf") ? (
                      <a
                        href={deposit.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--sp-navy)] px-4 py-2.5 text-xs font-bold text-white hover:opacity-90"
                      >
                        <span>📄 View Uploaded PDF Receipt</span>
                      </a>
                    ) : (
                      <div className="space-y-2">
                        <a
                          href={deposit.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block max-w-sm rounded-xl overflow-hidden border border-[var(--sp-border)] hover:opacity-95"
                        >
                          <img
                            src={deposit.receiptUrl}
                            alt="Payment Receipt"
                            className="max-h-72 w-auto object-contain bg-black/5"
                          />
                        </a>
                        <a
                          href={deposit.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs font-semibold text-sky-600 hover:underline"
                        >
                          Open original image in new tab ↗
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Receiving Platform Bank Account */}
              <div className="mt-6 rounded-2xl border border-[var(--sp-border)] p-5 space-y-3">
                <h3 className="text-sm font-bold text-[var(--sp-navy)] flex items-center gap-2">
                  <span>🏛️</span> Target Platform Bank Account
                </h3>
                {deposit.paymentAccount ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--sp-muted)] uppercase block font-semibold">
                        Bank Name
                      </span>
                      <span className="font-bold text-[var(--sp-navy)]">
                        {deposit.paymentAccount.bankName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--sp-muted)] uppercase block font-semibold">
                        Account Number
                      </span>
                      <span className="font-mono font-bold text-[var(--sp-navy)]">
                        {deposit.paymentAccount.accountNumber || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--sp-muted)] uppercase block font-semibold">
                        Account Name
                      </span>
                      <span className="font-bold text-[var(--sp-navy)]">
                        {deposit.paymentAccount.accountName || "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--sp-muted)]">
                    Default Company Bank Transfer
                  </p>
                )}
              </div>

              {/* User Metadata */}
              <div className="mt-6 border-t border-[var(--sp-border)] pt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-[var(--sp-muted)] block font-semibold">
                    Investor Email
                  </span>
                  <Link
                    href={`/admin/users/${deposit.userId}`}
                    className="font-bold text-[var(--sp-lime-deep)] hover:underline"
                  >
                    {deposit.userEmail}
                  </Link>
                  {deposit.userName ? (
                    <p className="text-[var(--sp-muted)]">{deposit.userName}</p>
                  ) : null}
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[var(--sp-muted)] block font-semibold">
                    Date Submitted
                  </span>
                  <p className="font-medium text-[var(--sp-navy)]">
                    {new Date(deposit.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Status Specific Notes */}
              {deposit.failureReason ? (
                <div className="mt-4 rounded-xl bg-red-50 p-4 text-xs text-red-700 border border-red-200">
                  <strong>Rejection Reason:</strong> {deposit.failureReason}
                </div>
              ) : null}

              {deposit.approvedByAdminEmail ? (
                <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200">
                  <strong>Approved By:</strong> {deposit.approvedByAdminEmail} at{" "}
                  {deposit.approvedAt ? new Date(deposit.approvedAt).toLocaleString() : ""}
                </div>
              ) : null}
            </AdminCard>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <AdminCard className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-[var(--sp-navy)]">
                Admin Decision
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[var(--sp-navy)] mb-1">
                  Internal Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Confirmed on bank statement session 98234"
                  className="w-full rounded-xl border border-[var(--sp-border)] bg-[var(--sp-surface)] p-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--sp-lime-deep)]"
                />
              </div>

              {deposit.status === "PENDING" || deposit.status === "PROCESSING" ? (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={submitting}
                    className="w-full rounded-xl bg-[var(--sp-lime-deep)] text-white hover:opacity-90 font-bold text-xs py-3 transition disabled:opacity-50"
                  >
                    {submitting ? "Processing..." : "✓ Approve & Credit Wallet"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    disabled={submitting}
                    className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    ✕ Reject Deposit
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-[var(--sp-surface)] p-3 text-center text-xs text-[var(--sp-muted)]">
                  This deposit has already been finalized as{" "}
                  <strong className="text-[var(--sp-navy)]">{deposit.status}</strong>.
                </div>
              )}
            </AdminCard>
          </div>
        </div>
      ) : null}

      {/* Reject Modal */}
      {showRejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[var(--sp-border)] bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--sp-navy)]">
              Reject Deposit
            </h3>
            <p className="text-xs text-[var(--sp-muted)]">
              Specify the reason for rejecting this deposit. The user will be able to see this reason.
            </p>

            <form onSubmit={handleReject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--sp-navy)] mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Transaction ID not found on bank statement / Invalid amount"
                  className="w-full rounded-xl border border-[var(--sp-border)] bg-[var(--sp-surface)] p-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--sp-danger)]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? "Rejecting..." : "Confirm Rejection"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="rounded-xl border border-[var(--sp-border)] px-4 py-2.5 text-xs font-semibold text-[var(--sp-navy)] hover:bg-[var(--sp-surface)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
