"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  PlusCircle,
  Building2,
  ShieldCheck,
  ChevronRight,
  X,
  Check,
  CreditCard,
  Trash2,
  Lock,
} from "lucide-react";
import { useUser } from "@/components/user-context";

type PayoutAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  createdAt: string;
};

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { theme } = useUser();
  const isDark = theme === "dark";

  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethodType, setSelectedMethodType] = useState<"bank" | "usdt">("bank");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // Form states
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you sure you want to remove this payment method?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/payout-accounts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchAccounts();
      } else {
        alert(data.error?.message || "Failed to remove payment method");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/payout-accounts");
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.items)) {
        setPayoutAccounts(data.data.items);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFormSuccess(null);

    const targetBankName = selectedMethodType === "usdt" ? `USDT (${bankName || "TRC20"})` : bankName;

    try {
      const res = await fetch("/api/payout-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: targetBankName,
          accountNumber,
          accountName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error?.message || "Failed to add payment method");
      } else {
        setFormSuccess("Payment method linked successfully!");
        setBankName("");
        setAccountNumber("");
        setAccountName("");
        await fetchAccounts();
        setTimeout(() => {
          setShowAddModal(false);
          setFormSuccess(null);
        }, 1200);
      }
    } catch {
      setFormError("Network connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      {/* Top Header */}
      <div className="-mx-4 -mt-4 px-4 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className={`p-1.5 rounded-full transition active:scale-95 ${
            isDark ? "hover:bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-800"
          }`}
          aria-label="Go Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className={`text-base font-bold flex-1 text-center pr-8 ${isDark ? "text-white" : "text-slate-900"}`}>
          Payment Methods
        </h1>
      </div>

      {/* Hero Banner Illustration */}
      <div className="w-full relative h-36 sm:h-40 rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-tr from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <Image
          src="/images/payment_methods_banner.jpg"
          alt="Secure Payment Methods"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      </div>

      {/* My Payment Methods Section */}
      <div className="space-y-2.5 pt-1">
        <div>
          <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            My Payment Methods
          </h2>
          {payoutAccounts.length === 0 && !loading && (
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              No payout methods yet
            </p>
          )}
        </div>

        {/* Existing Accounts List */}
        {payoutAccounts.length > 0 && (
          <div className="space-y-2">
            {payoutAccounts.map((acc) => {
              const isUsdt = acc.bankName?.toLowerCase().includes("usdt");
              return (
                <div
                  key={acc.id}
                  className={`p-4 rounded-2xl border transition shadow-xs flex items-center justify-between ${
                    isDark
                      ? "bg-slate-900/90 border-slate-800 text-white"
                      : "bg-white border-slate-200 text-slate-900 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isUsdt
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {isUsdt ? "₮" : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold">{acc.bankName}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#40b020]/20 text-[#40b020]">
                          {acc.status || "ACTIVE"}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[#40b020] font-semibold mt-0.5">
                        {acc.accountNumber}
                      </p>
                      <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {acc.accountName}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={deletingId === acc.id}
                    onClick={() => handleDeleteAccount(acc.id)}
                    className={`p-2 rounded-xl border transition ${
                      isDark
                        ? "border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-500/40 bg-slate-900/50"
                        : "border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 bg-slate-50"
                    } ${deletingId === acc.id ? "opacity-40 cursor-not-allowed" : ""}`}
                    title="Remove Payment Method"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Payment Method Dotted Button */}
        <button
          type="button"
          onClick={() => {
            setSelectedMethodType("bank");
            setShowAddModal(true);
          }}
          className={`w-full py-3.5 px-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 font-bold text-xs transition active:scale-98 ${
            isDark
              ? "border-slate-800 hover:border-[#40b020] text-slate-300 hover:text-white bg-slate-900/40"
              : "border-slate-300 hover:border-[#40b020] text-slate-700 hover:text-slate-950 bg-slate-50/70"
          }`}
        >
          <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs font-black">
            +
          </div>
          <span>Add Payment Method</span>
        </button>
      </div>

      {/* Recommended Section */}
      <div className="space-y-2.5 pt-2">
        <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
          Recommended
        </h3>

        <div
          className={`rounded-3xl border divide-y overflow-hidden shadow-xs ${
            isDark
              ? "bg-slate-900/90 border-slate-800 divide-slate-800 text-white"
              : "bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-sm"
          }`}
        >
          {/* USDT Method */}
          <div
            onClick={() => {
              setSelectedMethodType("usdt");
              setShowAddModal(true);
            }}
            className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-black text-lg">
                ₮
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold">USDT</h4>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Fastest
                  </span>
                </div>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                  Fast transfer, low fees
                </p>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                selectedMethodType === "usdt"
                  ? "border-[#40b020]"
                  : isDark
                  ? "border-slate-700"
                  : "border-slate-300"
              }`}
            >
              {selectedMethodType === "usdt" && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#40b020]" />
              )}
            </div>
          </div>

          {/* Bank / E-Wallet Method */}
          <div
            onClick={() => {
              setSelectedMethodType("bank");
              setShowAddModal(true);
            }}
            className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold">Bank / E-Wallet</h4>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                  Receive via bank or e-wallet
                </p>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                selectedMethodType === "bank"
                  ? "border-[#40b020]"
                  : isDark
                  ? "border-slate-700"
                  : "border-slate-300"
              }`}
            >
              {selectedMethodType === "bank" && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#40b020]" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secure & Safe Section */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowSecurityModal(true)}
          className={`w-full p-4 rounded-3xl border transition shadow-xs flex items-center justify-between text-left group active:scale-98 ${
            isDark
              ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-white"
              : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-900 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold truncate">Secure & Safe</h4>
              <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"} line-clamp-1`}>
                Your payment information is encrypted and protected.
              </p>
            </div>
          </div>

          <ChevronRight
            className={`w-4 h-4 shrink-0 ${
              isDark ? "text-slate-500 group-hover:text-white" : "text-slate-400 group-hover:text-slate-700"
            }`}
          />
        </button>
      </div>

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in max-h-[85vh] overflow-y-auto border ${
              isDark
                ? "bg-[#0f172a] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div
              className={`flex items-center justify-between pb-2 border-b ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <h3 className="text-sm font-bold flex items-center gap-2">
                {selectedMethodType === "usdt" ? (
                  <>
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs">
                      ₮
                    </span>
                    Add USDT Wallet
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 text-[#40b020]" /> Add Bank / E-Wallet
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-500 text-xs font-semibold">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-2.5 rounded-xl bg-[#40b020]/20 text-[#40b020] text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddAccount} className="space-y-3">
              {selectedMethodType === "usdt" ? (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Network / Protocol
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#40b020] border ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    >
                      <option value="TRC20">TRC20 (Tron Network - Recommended)</option>
                      <option value="BEP20">BEP20 (BNB Smart Chain)</option>
                      <option value="ERC20">ERC20 (Ethereum Network)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      USDT Wallet Address
                    </label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. Txyz... or 0x..."
                      className={`w-full rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Wallet Label / Owner Name
                    </label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="e.g. My Binance Wallet"
                      className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#40b020] border ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Bank or E-Wallet Name
                    </label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. OPay / Kuda / Access Bank / GTBank"
                      className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#40b020] border ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Account Number / Phone
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="10-digit account number"
                      className={`w-full rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Full name registered on account"
                      className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#40b020] border ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-xl bg-[#40b020] text-slate-950 font-bold text-xs hover:opacity-95 transition shadow-md shadow-[#40b020]/20 disabled:opacity-50 mt-2"
              >
                {saving ? "Saving..." : "Save Payment Method"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Info Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in border ${
              isDark
                ? "bg-[#0f172a] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div
              className={`flex items-center justify-between pb-2 border-b ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#40b020]" /> Security & Protection
              </h3>
              <button
                onClick={() => setShowSecurityModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs leading-relaxed">
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                All financial accounts and wallet credentials are encrypted using industry-standard AES-256 bank grade encryption.
              </p>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                For security, withdrawals require your 6-digit withdrawal PIN before dispatch.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSecurityModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#40b020] text-slate-950 font-bold text-xs hover:opacity-95 transition shadow-sm"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
