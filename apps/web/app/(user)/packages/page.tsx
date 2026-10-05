"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUser } from "@/components/user-context";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  dailyRoi: number;
  durationDays: number;
  tasksPerDay: number;
  payPerTask: number;
  dailyEarnings: number;
  status: string;
  imageUrl?: string | null;
};

type PlatformAccount = {
  id: string;
  type: string;
  label: string;
  accountName: string;
  accountNumber: string;
  bankName: string | null;
  provider: string | null;
  notes: string | null;
};

export default function PackagesPage() {
  const router = useRouter();
  const { wallet, activePlan, refreshUserData, theme } = useUser();
  const isDark = theme === "dark";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 3;
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [payMethod, setPayMethod] = useState<"wallet" | "transfer">("wallet");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  // Manual payment state
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [senderTransactionId, setSenderTransactionId] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptKey, setReceiptKey] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data?.items)) {
          setPlans(d.data.items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch("/api/payment-accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data?.items)) {
          setPlatformAccounts(d.data.items);
          if (d.data.items.length > 0) {
            setSelectedBankId(d.data.items[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    setPurchaseError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/deposits/receipt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        setPurchaseError(data.error?.message || "Failed to upload receipt.");
        return;
      }
      setReceiptUrl(data.data.receiptUrl);
      setReceiptKey(data.data.storageKey);
      setReceiptFileName(file.name);
    } catch {
      setPurchaseError("Network error uploading receipt.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setPurchasing(true);
    setPurchaseError(null);

    if (payMethod === "wallet") {
      try {
        const res = await fetch(`/api/plans/${selectedPlan.id}/purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotCount: 1 }),
        });
        const data = await res.json();

        if (!data.success) {
          setPurchaseError(data.error?.message || "Failed to subscribe to package.");
          return;
        }

        setPurchaseSuccess(true);
        await refreshUserData();
      } catch {
        setPurchaseError("Network error. Please try again.");
      } finally {
        setPurchasing(false);
      }
    } else {
      // Manual bank transfer verification submission
      if (!senderTransactionId.trim() && !receiptUrl.trim()) {
        setPurchaseError("Please provide your transaction reference ID or upload payment receipt.");
        setPurchasing(false);
        return;
      }

      try {
        const res = await fetch("/api/deposits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(selectedPlan.price),
            paymentAccountId: selectedBankId || undefined,
            senderTransactionId: senderTransactionId.trim() || undefined,
            senderName: senderName.trim() || undefined,
            receiptUrl: receiptUrl.trim() || undefined,
            receiptKey: receiptKey.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setPurchaseError(data.error?.message || "Failed to submit payment proof.");
          return;
        }

        setDepositSuccessMsg(
          `Payment proof for ${selectedPlan.name} (₦${Number(selectedPlan.price).toLocaleString()}) submitted successfully! Once approved by admin, your balance will be credited to activate your subscription.`,
        );
        await refreshUserData();
      } catch {
        setPurchaseError("Network error submitting proof.");
      } finally {
        setPurchasing(false);
      }
    }
  };

  const closeModal = () => {
    setSelectedPlan(null);
    setPurchaseError(null);
    setPurchaseSuccess(false);
    setDepositSuccessMsg(null);
    setSenderTransactionId("");
    setSenderName("");
    setReceiptUrl("");
    setReceiptKey("");
    setReceiptFileName("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div
        className={`glass-panel p-6 rounded-3xl border relative overflow-hidden ${
          isDark ? "border-slate-800/80" : "border-slate-200/90 bg-white"
        }`}
      >
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#40b020]/20 text-[#40b020] text-xs font-bold border border-[#40b020]/30 mb-2">
            <Zap className="w-3.5 h-3.5 fill-current" /> SPEED PAY SUBSCRIPTIONS
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isDark ? "text-white" : "text-slate-950"
            }`}
          >
            Subscription Packages
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Choose your package tier to unlock daily tasks. Complete simple tasks every day and earn guaranteed rewards directly to your wallet.
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-[#40b020] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div
          className={`glass-panel p-10 rounded-2xl text-center text-sm ${
            isDark ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-200 bg-white"
          }`}
        >
          No subscription packages currently available.
        </div>
      ) : (
        (() => {
          const totalPages = Math.max(1, Math.ceil(plans.length / PAGE_SIZE));
          const paginatedPlans = plans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

          const getVisiblePageNumbers = (current: number, total: number, maxVisible = 5) => {
            if (total <= maxVisible) {
              return Array.from({ length: total }, (_, i) => i + 1);
            }
            const half = Math.floor(maxVisible / 2);
            const start = Math.max(1, current - half);
            const end = Math.min(total, start + maxVisible - 1);
            const adjustedStart = end - start + 1 < maxVisible ? Math.max(1, end - maxVisible + 1) : start;
            return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i);
          };

          return (
            <div className="space-y-4">
              {/* Plans Column List (Task List Widget Style) */}
              <div className="flex flex-col gap-3.5">
                {paginatedPlans.map((plan, idx) => {
                  const isSubscribed = activePlan?.planId === plan.id;
                  const dailyReward =
                    plan.dailyEarnings ||
                    (plan.tasksPerDay && plan.payPerTask
                      ? plan.tasksPerDay * plan.payPerTask
                      : Math.round(plan.price * 0.033));
                  const tasksCount = plan.tasksPerDay || 5;
                  const payPerTask = plan.payPerTask || Math.round(dailyReward / tasksCount);
                  const globalIdx = (currentPage - 1) * PAGE_SIZE + idx;

                  const thumbs = [
                    "/images/task_thumb_1.jpg",
                    "/images/task_thumb_2.jpg",
                    "/images/task_thumb_3.jpg",
                  ];
                  const thumbSrc = plan.imageUrl || thumbs[globalIdx % thumbs.length] || "/images/task_thumb_1.jpg";

                  return (
                    <div
                      key={plan.id}
                      className={`p-3 sm:p-4 rounded-3xl border transition-all flex items-center gap-3.5 shadow-xs ${
                        isSubscribed
                          ? isDark
                            ? "border-slate-800/60 opacity-80 bg-slate-900/40"
                            : "border-slate-200 opacity-80 bg-slate-100"
                          : isDark
                          ? "bg-[#131d33]/90 border-slate-800 hover:border-[#40b020]/40 text-white"
                          : "bg-white border-[#e6ebf2] hover:border-[#40b020]/50 text-slate-900 shadow-sm"
                      }`}
                    >
                      {/* Left: Thumbnail Image */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden relative shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                        <Image
                          src={thumbSrc}
                          alt={plan.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>

                      {/* Middle: Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className={`text-xs sm:text-sm font-bold truncate leading-snug ${isDark ? "text-white" : "text-slate-900"}`}>
                          {plan.name}
                        </h4>

                        {/* 2-Column Stats (Amount / Reward) */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-[10px] text-slate-400 block leading-tight">Amount</span>
                            <span className={`font-semibold truncate block ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                              NGN {Number(plan.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block leading-tight">Reward</span>
                            <span className={`font-semibold truncate block ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                              NGN {Number(payPerTask).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {/* Highlighted Green Reward */}
                        <div className="pt-0.5">
                          <span className="text-xs sm:text-sm font-black text-[#15803d] dark:text-[#40b020] block leading-tight">
                            NGN {Number(dailyReward).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-semibold text-[#15803d]/80 dark:text-[#40b020]/80 block leading-tight">
                            Daily Profit
                          </span>
                        </div>
                      </div>

                      {/* Right: Action Button */}
                      <div className="shrink-0 pl-1">
                        {isSubscribed ? (
                          <span className="px-3 py-1.5 rounded-full bg-[#40b020]/20 text-[#15803d] dark:text-[#40b020] text-xs font-bold flex items-center gap-1 border border-[#40b020]/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlan(plan);
                              setPayMethod(wallet && wallet.availableBalance >= plan.price ? "wallet" : "transfer");
                            }}
                            className="px-3.5 sm:px-4 py-2 rounded-full font-bold text-xs shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                          >
                            Join now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="pt-4 flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                        currentPage === 1
                          ? "opacity-30 cursor-not-allowed text-slate-400"
                          : isDark
                          ? "bg-slate-800 hover:bg-slate-700 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {getVisiblePageNumbers(currentPage, totalPages, 5).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                            currentPage === pageNum
                              ? "bg-[#40b020] text-slate-950 shadow-md shadow-[#40b020]/20"
                              : isDark
                              ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-950 shadow-xs"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                        currentPage === totalPages
                          ? "opacity-30 cursor-not-allowed text-slate-400"
                          : isDark
                          ? "bg-slate-800 hover:bg-slate-700 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      }`}
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, plans.length)} of {plans.length} Packages
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Subscription Confirmation Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md max-h-[90vh] overflow-y-auto p-6 rounded-3xl border shadow-2xl space-y-5 animate-scale-up ${
              isDark
                ? "bg-[#0f172a] border-slate-700 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {purchaseSuccess ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#40b020]/20 text-[#40b020] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                  Subscription Activated!
                </h3>
                <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  You are now subscribed to <span className="font-bold text-[#40b020]">{selectedPlan.name}</span>. Your daily tasks are now available in the Tasks room!
                </p>
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      closeModal();
                      router.push("/tasks");
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#40b020] text-slate-950 font-bold text-xs shadow-lg shadow-[#40b020]/25 hover:opacity-95"
                  >
                    Go to Daily Tasks
                  </button>
                  <button
                    onClick={closeModal}
                    className={`py-3 px-4 rounded-xl font-semibold text-xs transition ${
                      isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : depositSuccessMsg ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#40b020]/20 text-[#40b020] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                  Payment Proof Submitted!
                </h3>
                <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {depositSuccessMsg}
                </p>
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      closeModal();
                      router.push("/wallet?tab=transactions");
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#40b020] text-slate-950 font-bold text-xs shadow-lg shadow-[#40b020]/25 hover:opacity-95"
                  >
                    View Status in Wallet
                  </button>
                  <button
                    onClick={closeModal}
                    className={`py-3 px-4 rounded-xl font-semibold text-xs transition ${
                      isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                    Subscribe to {selectedPlan.name}
                  </h3>
                  <button
                    onClick={closeModal}
                    className={`text-xs font-semibold p-1 ${
                      isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    ✕
                  </button>
                </div>

                {/* Plan Summary */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                    isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div>
                    <span className={`block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Package Price
                    </span>
                    <span className={`text-base font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                      ₦{Number(selectedPlan.price).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`block ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Daily Task Earnings
                    </span>
                    <span className="font-bold text-[#40b020]">
                      ₦{Number(selectedPlan.dailyEarnings || Math.round(selectedPlan.price * 0.033)).toLocaleString()} / day
                    </span>
                  </div>
                </div>

                {/* Payment Method Switcher */}
                <div
                  className={`grid grid-cols-2 gap-2 p-1 rounded-xl border ${
                    isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-100 border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setPayMethod("wallet")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition ${
                      payMethod === "wallet"
                        ? "bg-[#40b020] text-slate-950 shadow-sm"
                        : isDark
                        ? "text-slate-400 hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Wallet (₦{wallet ? Number(wallet.availableBalance).toLocaleString() : 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod("transfer")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition ${
                      payMethod === "transfer"
                        ? "bg-[#40b020] text-slate-950 shadow-sm"
                        : isDark
                        ? "text-slate-400 hover:text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Bank Transfer / Deposit
                  </button>
                </div>

                {purchaseError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{purchaseError}</span>
                  </div>
                )}

                {/* Option 1: Wallet Balance */}
                {payMethod === "wallet" && (
                  <div className="space-y-4">
                    {wallet && wallet.availableBalance < selectedPlan.price ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Insufficient wallet balance. You can pay directly with bank transfer below.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPayMethod("transfer")}
                          className="w-full py-3 px-4 rounded-xl bg-[#40b020] text-slate-950 font-bold text-xs shadow-md shadow-[#40b020]/20"
                        >
                          Switch to Direct Bank Transfer →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          ₦{Number(selectedPlan.price).toLocaleString()} will be deducted from your wallet balance of ₦{wallet ? Number(wallet.availableBalance).toLocaleString() : 0}.
                        </p>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={handleSubscribe}
                            disabled={purchasing}
                            className="flex-1 py-3 rounded-xl bg-[#40b020] hover:bg-[#50b020] text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#40b020]/25 disabled:opacity-50"
                          >
                            {purchasing ? "Activating..." : "Confirm & Activate"}
                          </button>
                          <button
                            onClick={closeModal}
                            className={`py-3 px-4 rounded-xl font-semibold text-xs transition ${
                              isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: Bank Transfer / Deposit */}
                {payMethod === "transfer" && (
                  <div className="space-y-3.5">
                    {/* Bank Info */}
                    <div
                      className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${
                        isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {platformAccounts[0] ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Bank Name:</span>
                            <div className={`flex items-center gap-1.5 font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                              <span>{platformAccounts[0].bankName || platformAccounts[0].provider}</span>
                              <button
                                type="button"
                                onClick={() => copyText(platformAccounts[0]?.bankName || "", "p-bank")}
                                className="text-[10px] text-[#40b020] hover:underline"
                              >
                                {copiedLabel === "p-bank" ? "Copied" : "Copy"}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Account Number:</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-[#40b020]">
                              <span>{platformAccounts[0].accountNumber}</span>
                              <button
                                type="button"
                                onClick={() => copyText(platformAccounts[0]?.accountNumber || "", "p-acc")}
                                className="text-[10px] text-[#40b020] hover:underline font-sans"
                              >
                                {copiedLabel === "p-acc" ? "Copied" : "Copy"}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Account Name:</span>
                            <span className={`font-bold text-[11px] ${isDark ? "text-white" : "text-slate-900"}`}>
                              {platformAccounts[0].accountName}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Bank:</span>
                            <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Wema Bank / PalmPay</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Account:</span>
                            <span className="font-mono font-bold text-[#40b020]">0123456789</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Name:</span>
                            <span className={`font-bold text-[11px] ${isDark ? "text-white" : "text-slate-900"}`}>
                              SPEED PAY GLOBAL TECH LTD
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Transaction ID */}
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Transaction ID / Session Reference *
                      </label>
                      <input
                        type="text"
                        value={senderTransactionId}
                        onChange={(e) => setSenderTransactionId(e.target.value)}
                        placeholder="Paste transfer session ID or reference"
                        className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#40b020] ${
                          isDark
                            ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                        }`}
                      />
                    </div>

                    {/* Sender Name */}
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Sender / Depositor Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Name on bank account transferred from"
                        className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#40b020] ${
                          isDark
                            ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                        }`}
                      />
                    </div>

                    {/* Upload Receipt */}
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        Upload Payment Receipt (Optional if TX ID provided)
                      </label>
                      <div
                        className={`rounded-xl border border-dashed p-2.5 text-center ${
                          isDark
                            ? "border-slate-700 bg-slate-900/60"
                            : "border-slate-300 bg-slate-50"
                        }`}
                      >
                        {receiptUrl ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#40b020] truncate max-w-[200px]">
                              ✓ {receiptFileName || "Receipt attached"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptUrl("");
                                setReceiptKey("");
                                setReceiptFileName("");
                              }}
                              className="text-xs text-red-500 hover:underline font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className={`cursor-pointer block text-xs ${isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
                            {uploadingReceipt ? (
                              <span className="text-[#40b020]">Uploading receipt...</span>
                            ) : (
                              <span>📎 Attach receipt image or PDF</span>
                            )}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,application/pdf"
                              onChange={handleReceiptUpload}
                              disabled={uploadingReceipt}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={handleSubscribe}
                        disabled={purchasing || uploadingReceipt}
                        className="flex-1 py-3 rounded-xl bg-[#40b020] hover:bg-[#50b020] text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#40b020]/25 disabled:opacity-50"
                      >
                        {purchasing ? "Submitting Proof..." : `Submit Payment Proof (₦${Number(selectedPlan.price).toLocaleString()})`}
                      </button>
                      <button
                        onClick={closeModal}
                        className={`py-3 px-4 rounded-xl font-semibold text-xs transition ${
                          isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

