"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Info,
  Lock,
  Building2,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCw,
} from "lucide-react";
import { useUser } from "@/components/user-context";

type PayoutAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
};

export default function WithdrawPage() {
  const router = useRouter();
  const { wallet, refreshUserData, theme } = useUser();
  const isDark = theme === "dark";

  // Balance visibility toggle
  const [showBalance, setShowBalance] = useState(true);

  // Pin / Trade password status
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);

  // Set PIN form state
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [settingPin, setSettingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Withdrawal form state
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string>("");
  const [amount, setAmount] = useState<string>("2000");
  const [tradePassword, setTradePassword] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Add Bank state
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  const fetchInitialData = async () => {
    try {
      const [pinRes, bankRes] = await Promise.all([
        fetch("/api/withdrawal-pin").then((r) => r.json()).catch(() => null),
        fetch("/api/payout-accounts").then((r) => r.json()).catch(() => null),
      ]);

      if (pinRes?.success && pinRes.data?.hasPin !== undefined) {
        setHasPin(Boolean(pinRes.data.hasPin));
      } else {
        setHasPin(false);
      }

      if (bankRes?.success && Array.isArray(bankRes.data?.items)) {
        setPayoutAccounts(bankRes.data.items);
        if (bankRes.data.items.length > 0) {
          setSelectedPayoutId(bankRes.data.items[0].id);
        }
      }
    } catch {
      setHasPin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSetTradePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError(null);

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setPinError("Trade password must be exactly 6 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Passwords do not match.");
      return;
    }

    setSettingPin(true);
    try {
      const res = await fetch("/api/withdrawal-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPin }),
      });
      const data = await res.json();

      if (!data.success) {
        setPinError(data.error?.message || "Failed to set trade password.");
        return;
      }

      setHasPin(true);
      setShowSetPinModal(false);
      setNewPin("");
      setConfirmPin("");
      await refreshUserData();
    } catch {
      setPinError("Network error. Please try again.");
    } finally {
      setSettingPin(false);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError(null);
    setSavingBank(true);

    try {
      const res = await fetch("/api/payout-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName,
          accountNumber,
          accountName,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setBankError(data.error?.message || "Failed to add bank account.");
        return;
      }

      setShowAddBankModal(false);
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      await fetchInitialData();
    } catch {
      setBankError("Network error. Please try again.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount < 1000) {
      setWithdrawError("Minimum withdrawal amount is ₦1,000.");
      return;
    }
    if (!selectedPayoutId) {
      setWithdrawError("Please select or add a receiving bank account.");
      return;
    }
    if (!tradePassword || tradePassword.length !== 6) {
      setWithdrawError("Enter your 6-digit trade password.");
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutAccountId: selectedPayoutId,
          amount: parsedAmount,
          pin: tradePassword,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setWithdrawError(data.error?.message || "Withdrawal request failed.");
        return;
      }

      setWithdrawSuccess(true);
      setTradePassword("");
      await refreshUserData();
    } catch {
      setWithdrawError("Network error. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const availableBalance = Number(wallet?.availableBalance || 0);
  const totalEarnings = Number(wallet?.totalCommission || wallet?.totalEarned || 900);
  const totalWithdrawn = Number(wallet?.totalWithdrawn || 0);
  const pendingBalance = Number(wallet?.pendingBalance || 0);

  return (
    <div className="space-y-4 animate-fade-in pb-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-1 pt-1 pb-1">
        <button
          type="button"
          onClick={() => router.back()}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition border ${
            isDark
              ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950"
          }`}
          title="Go back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1
          className={`text-base sm:text-lg font-black tracking-tight ${
            isDark ? "text-white" : "text-slate-950"
          }`}
        >
          Withdraw
        </h1>
        <div className="w-8" />
      </div>

      {/* Top Wallet Hero Card matching reference screenshot */}
      <div
        className={`rounded-3xl border relative overflow-hidden shadow-sm transition-all ${
          isDark
            ? "bg-slate-900/90 border-slate-800 text-white"
            : "bg-[#f3f4f6] border-slate-200/80 text-slate-900"
        }`}
      >
        <div className="p-5 sm:p-6 flex flex-row items-center justify-between gap-4">
          {/* Balance Metrics */}
          <div className="space-y-1 z-10 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Available Balance
              </span>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className={`p-1 rounded-md transition ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
                title={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="text-2xl sm:text-3xl font-black tracking-tight flex items-baseline gap-1">
              <span className="text-slate-900 dark:text-white font-mono">
                {showBalance
                  ? `NGN ${availableBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "••••••••"}
              </span>
            </div>

            <div className={`text-[11px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              NGN
            </div>
          </div>

          {/* Right: 3D White Wallet Image */}
          <div className="w-[120px] sm:w-[150px] h-[90px] sm:h-[110px] relative shrink-0">
            <Image
              src="/images/wallet_hero.jpg"
              alt="Wallet Hero"
              fill
              className="object-contain object-right"
              sizes="150px"
              priority
            />
          </div>
        </div>

        {/* 3-Column Stats Sub-bar */}
        <div
          className={`grid grid-cols-3 gap-2 px-5 py-3.5 border-t text-center ${
            isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-200/50 border-slate-200"
          }`}
        >
          <div>
            <span className={`text-[10px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Total Earnings
            </span>
            <span className={`text-xs font-bold block mt-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>
              NGN {totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className={`border-x ${isDark ? "border-slate-800" : "border-slate-300/80"}`}>
            <span className={`text-[10px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Withdrawn
            </span>
            <span className={`text-xs font-bold block mt-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>
              NGN {totalWithdrawn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1">
              <span className={`text-[10px] block font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Pending
              </span>
              <Info className={`w-3 h-3 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
            </div>
            <span className={`text-xs font-bold block mt-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>
              NGN {pendingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-[#40b020] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : hasPin === false ? (
        /* State 1: Trade password is NOT set */
        <div className="space-y-4 pt-1">
          <div className="space-y-1">
            <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              Set Trade Password
            </h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Enter a 6-digit trade password
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setPinError(null);
              setShowSetPinModal(true);
            }}
            className="w-full py-3.5 rounded-full bg-[#181e29] hover:bg-black text-white font-bold text-xs shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Set Trade Password</span>
          </button>
        </div>
      ) : (
        /* State 2: Trade password IS set -> Withdrawal Form */
        <div
          className={`p-5 sm:p-6 rounded-3xl border space-y-5 shadow-xs ${
            isDark ? "bg-[#131d33]/90 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
            <div>
              <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                Request Withdrawal
              </h3>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Withdraw funds to your verified Nigerian bank account
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSetPinModal(true)}
              className="text-xs text-[#40b020] hover:underline font-semibold"
            >
              Change PIN
            </button>
          </div>

          {withdrawSuccess ? (
            <div className="text-center py-6 space-y-3 animate-scale-up">
              <div className="w-14 h-14 rounded-full bg-[#40b020]/20 text-[#40b020] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                Withdrawal Submitted!
              </h4>
              <p className={`text-xs max-w-sm mx-auto ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Your withdrawal request of ₦{Number(amount).toLocaleString()} has been submitted and is processing.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setWithdrawSuccess(false)}
                  className="px-5 py-2.5 rounded-full bg-[#40b020] text-slate-950 font-bold text-xs"
                >
                  Make Another Withdrawal
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleWithdraw} className="space-y-4">
              {withdrawError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {/* Bank Account Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Receiving Bank Account
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddBankModal(true)}
                    className="text-xs text-[#40b020] hover:underline font-bold flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Bank
                  </button>
                </div>

                {payoutAccounts.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAddBankModal(true)}
                    className={`w-full p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs font-semibold transition ${
                      isDark
                        ? "border-slate-800 hover:border-[#40b020] text-slate-400"
                        : "border-slate-200 hover:border-[#40b020] text-slate-600"
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-[#40b020]" />
                    <span>No bank account added. Click to add your bank</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {payoutAccounts.map((acct) => (
                      <div
                        key={acct.id}
                        onClick={() => setSelectedPayoutId(acct.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                          selectedPayoutId === acct.id
                            ? isDark
                              ? "border-[#40b020] bg-slate-900"
                              : "border-[#40b020] bg-emerald-50/60"
                            : isDark
                            ? "border-slate-800 bg-slate-900/60"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                            {acct.bankName} • {acct.accountNumber}
                          </div>
                          <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {acct.accountName}
                          </div>
                        </div>
                        {selectedPayoutId === acct.id && (
                          <span className="text-[10px] font-bold text-[#40b020] bg-[#40b020]/15 px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Withdrawal Amount (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                    ₦
                  </span>
                  <input
                    type="number"
                    min={1000}
                    max={availableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (min 1,000)"
                    className={`w-full pl-8 pr-4 py-3 rounded-2xl border text-xs font-bold focus:outline-none focus:border-[#40b020] ${
                      isDark
                        ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                {/* Quick select chips */}
                <div className="flex gap-2 pt-1">
                  {[2000, 5000, 10000, 20000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val.toString())}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                        amount === val.toString()
                          ? "bg-[#40b020] text-slate-950 border-[#40b020]"
                          : isDark
                          ? "bg-slate-900 border-slate-800 text-slate-400"
                          : "bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                    >
                      ₦{val.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount(Math.floor(availableBalance).toString())}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      isDark
                        ? "bg-slate-900 border-slate-800 text-[#40b020]"
                        : "bg-slate-100 border-slate-200 text-[#15803d]"
                    }`}
                  >
                    All
                  </button>
                </div>
              </div>

              {/* 6-Digit Trade Password Input */}
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  6-Digit Trade Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    value={tradePassword}
                    onChange={(e) => setTradePassword(e.target.value)}
                    placeholder="Enter your 6-digit trade password"
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs font-mono font-bold tracking-widest focus:outline-none focus:border-[#40b020] ${
                      isDark
                        ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={withdrawing || availableBalance < 1000}
                  className={`w-full py-3.5 rounded-full font-bold text-xs shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
                    isDark
                      ? "bg-[#40b020] hover:bg-[#50b020] text-slate-950 shadow-[#40b020]/20 disabled:opacity-50"
                      : "bg-[#181e29] hover:bg-black text-white shadow-slate-900/20 disabled:opacity-50"
                  }`}
                >
                  {withdrawing ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Withdrawal...</span>
                    </>
                  ) : (
                    <span>Submit Withdrawal Request</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Modal: Set Trade Password (matches reference screenshot popup) */}
      {showSetPinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className={`w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl border shadow-2xl space-y-5 animate-scale-up ${
              isDark ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Header with Title & Close ✕ */}
            <div className="flex items-center justify-between">
              <h3 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                Set Trade Password
              </h3>
              <button
                type="button"
                onClick={() => setShowSetPinModal(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition ${
                  isDark ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-950"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Enter a 6-digit trade password
            </p>

            {pinError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleSetTradePassword} className="space-y-3.5">
              {/* Input 1 */}
              <div>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter a 6-digit trade password"
                  className={`w-full px-4 py-3.5 rounded-full border text-xs focus:outline-none focus:border-[#40b020] ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Input 2 */}
              <div>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter the password again"
                  className={`w-full px-4 py-3.5 rounded-full border text-xs focus:outline-none focus:border-[#40b020] ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={settingPin || newPin.length !== 6 || confirmPin.length !== 6}
                  className={`w-full py-3.5 rounded-full font-bold text-xs shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 ${
                    newPin.length === 6 && confirmPin.length === 6
                      ? "bg-[#181e29] hover:bg-black text-white"
                      : isDark
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {settingPin ? "Saving Password..." : "Set Trade Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Bank Account */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className={`w-full max-w-md p-6 rounded-t-3xl sm:rounded-3xl border shadow-2xl space-y-5 animate-scale-up ${
              isDark ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                Add Bank Account
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition ${
                  isDark ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-950"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bankError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bankError}</span>
              </div>
            )}

            <form onSubmit={handleAddBank} className="space-y-3.5">
              <div>
                <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Access Bank, GTBank, PalmPay, OPay"
                  className={`w-full px-4 py-3 rounded-xl border text-xs focus:outline-none focus:border-[#40b020] ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit account number"
                  className={`w-full px-4 py-3 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:border-[#40b020] ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Account holder full name"
                  className={`w-full px-4 py-3 rounded-xl border text-xs focus:outline-none focus:border-[#40b020] ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingBank}
                  className="w-full py-3.5 rounded-xl bg-[#40b020] hover:bg-[#50b020] text-slate-950 font-bold text-xs shadow-md shadow-[#40b020]/20 transition cursor-pointer"
                >
                  {savingBank ? "Saving..." : "Save Bank Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
