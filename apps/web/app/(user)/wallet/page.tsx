"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PlusCircle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowDownLeft,
  History,
  ShieldCheck,
  Zap,
  Check,
} from "lucide-react";
import { useUser } from "@/components/user-context";

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

type PayoutAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
};

type Transaction = {
  id: string;
  type: string;
  direction: "CREDIT" | "DEBIT";
  amount: number;
  status: string;
  description: string;
  createdAt: string;
};

const PROMOTED_PARTNER_PRODUCTS = [
  {
    id: "prod-huawei-5kw",
    partner: "Huawei Solar",
    title: "Huawei FusionSolar Smart Inverter (5kW)",
    category: "Hybrid PV",
    amount: 12000,
    dailyReward: 400,
    badge: "Popular Partner",
    image: "/images/task_thumb_1.jpg",
    specs: "98.4% Efficiency · Smart Remote Sync",
  },
  {
    id: "prod-sungrow-10kwh",
    partner: "Sungrow Power",
    title: "Sungrow High-Voltage Storage (10kWh)",
    category: "Battery Storage",
    amount: 54000,
    dailyReward: 1800,
    badge: "High Yield",
    image: "/images/task_thumb_2.jpg",
    specs: "6,000+ Cycles · Modular LiFePO4",
  },
  {
    id: "prod-longi-bifacial",
    partner: "LONGi Green Energy",
    title: "LONGi Hi-MO X6 Solar Array (550W)",
    category: "Solar Modules",
    amount: 89000,
    dailyReward: 3000,
    badge: "Tier 1 Brand",
    image: "/images/task_thumb_3.jpg",
    specs: "22.8% Conversion · Anti-PID Tech",
  },
  {
    id: "prod-canadian-microgrid",
    partner: "Canadian Solar",
    title: "Canadian Solar Microgrid Generator",
    category: "Microgrid Node",
    amount: 120000,
    dailyReward: 4000,
    badge: "Enterprise",
    image: "/images/solar_plant.jpg",
    specs: "24/7 Clean Energy Dispatch Node",
  },
];

function WalletContent() {
  const searchParams = useSearchParams();
  const { wallet, refreshUserData, theme } = useUser();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "transactions">("deposit");

  // Deposit State
  const [selectedProductId, setSelectedProductId] = useState<string>("prod-huawei-5kw");
  const [depositAmount, setDepositAmount] = useState<number>(12000);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [selectedPlatformAccountId, setSelectedPlatformAccountId] = useState<string>("");
  const [senderTransactionId, setSenderTransactionId] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptKey, setReceiptKey] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(2000);
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string>("");
  const [withdrawalPin, setWithdrawalPin] = useState<string>("");
  const [hasPin, setHasPin] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txFilter, setTxFilter] = useState<string>("ALL");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "withdraw" || tab === "deposit" || tab === "transactions") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    // Fetch active company bank accounts
    fetch("/api/payment-accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data?.items)) {
          setPlatformAccounts(d.data.items);
          if (d.data.items.length > 0) {
            setSelectedPlatformAccountId(d.data.items[0].id);
          }
        }
      })
      .catch(() => {});

    // Fetch saved payout accounts
    fetch("/api/payout-accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data?.items)) {
          setPayoutAccounts(d.data.items);
          if (d.data.items.length > 0) {
            setSelectedPayoutId(d.data.items[0].id);
          }
        }
      })
      .catch(() => {});

    // Fetch withdrawal PIN status & withdrawal availability
    fetch("/api/withdrawals")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.withdrawalsEnabled !== undefined) {
          setWithdrawalsEnabled(Boolean(d.data.withdrawalsEnabled));
        }
      })
      .catch(() => {});

    fetch("/api/withdrawal-pin")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.hasPin !== undefined) {
          setHasPin(Boolean(d.data.hasPin));
        }
      })
      .catch(() => {});

    // Fetch transactions & wallet
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (Array.isArray(d.data?.wallet?.recentTransactions)) {
            setTransactions(d.data.wallet.recentTransactions);
          }
          if (d.data?.withdrawalsEnabled !== undefined) {
            setWithdrawalsEnabled(Boolean(d.data.withdrawalsEnabled));
          }
        }
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    setDepositError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/deposits/receipt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        setDepositError(data.error?.message || "Failed to upload receipt.");
        return;
      }

      setReceiptUrl(data.data.receiptUrl);
      setReceiptKey(data.data.storageKey);
      setReceiptFileName(file.name);
    } catch {
      setDepositError("Network error uploading receipt.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderTransactionId.trim() && !receiptUrl.trim()) {
      setDepositError("Please provide your bank transfer transaction ID or upload a payment receipt.");
      return;
    }

    setDepositing(true);
    setDepositError(null);

    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(depositAmount),
          paymentAccountId: selectedPlatformAccountId || undefined,
          senderTransactionId: senderTransactionId.trim() || undefined,
          senderName: senderName.trim() || undefined,
          receiptUrl: receiptUrl.trim() || undefined,
          receiptKey: receiptKey.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setDepositError(data.error?.message || "Failed to submit deposit request.");
        return;
      }

      setDepositSuccess(true);
      setSenderTransactionId("");
      setSenderName("");
      setReceiptUrl("");
      setReceiptKey("");
      setReceiptFileName("");
      await refreshUserData();
    } catch {
      setDepositError("Network error. Please try again.");
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawing(true);
    setWithdrawError(null);

    if (!withdrawalsEnabled) {
      setWithdrawError("Server overload wait for a few moment");
      setWithdrawing(false);
      return;
    }

    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          payoutAccountId: selectedPayoutId,
          pin: withdrawalPin,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setWithdrawError(data.error?.message || "Failed to submit withdrawal request.");
        return;
      }

      setWithdrawSuccess(true);
      await refreshUserData();
    } catch {
      setWithdrawError("Network error. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const PRESET_AMOUNTS = [12000, 54000, 89000, 120000, 200000, 500000];
  const WITHDRAWAL_PRESETS = [2000, 5000, 10000, 30000, 50000, 100000, 200000, 500000];

  const filteredTransactions = transactions.filter((t) => {
    if (txFilter === "ALL") return true;
    if (txFilter === "CREDIT") return t.direction === "CREDIT";
    if (txFilter === "DEBIT") return t.direction === "DEBIT";
    if (txFilter === "COMMISSION") return t.type === "COMMISSION";
    if (txFilter === "TASK") return t.type === "TASK_REWARD" || t.description?.includes("Task");
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Wallet Summary */}
      <div
        className={`p-6 rounded-3xl border relative overflow-hidden ${
          isDark
            ? "glass-panel-navy border-[#10356c]/80 text-white"
            : "bg-gradient-to-r from-[#002060] to-[#10356c] border-[#10356c] text-white shadow-lg"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider block mb-1">
              Available Wallet Balance
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
              <span className="text-[#40b020]">₦</span>
              <span>{wallet ? Number(wallet.availableBalance).toLocaleString() : "0"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("deposit")}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "deposit"
                  ? "bg-[#40b020] text-slate-950 shadow-lg shadow-[#40b020]/25"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Deposit
            </button>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "withdraw"
                  ? "bg-[#40b020] text-slate-950 shadow-lg shadow-[#40b020]/25"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> Withdraw
            </button>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-white/15">
          <div>
            <span className="text-[10px] text-slate-300 uppercase font-semibold">Total Deposited</span>
            <div className="text-sm font-bold text-white mt-0.5">
              ₦{wallet ? Number(wallet.totalDeposited || 0).toLocaleString() : "0"}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-300 uppercase font-semibold">Total Withdrawn</span>
            <div className="text-sm font-bold text-white mt-0.5">
              ₦{wallet ? Number(wallet.totalWithdrawn || 0).toLocaleString() : "0"}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-300 uppercase font-semibold">Commissions</span>
            <div className="text-sm font-bold text-[#40b020] mt-0.5">
              ₦{wallet ? Number(wallet.totalCommission || 0).toLocaleString() : "0"}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={`flex items-center gap-2 border-b pb-3 ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <button
          onClick={() => setActiveTab("deposit")}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "deposit"
              ? "bg-[#40b020] text-slate-950 shadow-md shadow-[#40b020]/20"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Deposit Funds
        </button>
        <button
          onClick={() => setActiveTab("withdraw")}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "withdraw"
              ? "bg-[#40b020] text-slate-950 shadow-md shadow-[#40b020]/20"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" /> Withdraw Funds
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "transactions"
              ? "bg-[#40b020] text-slate-950 shadow-md shadow-[#40b020]/20"
              : isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-600 hover:text-slate-950"
          }`}
        >
          <History className="w-4 h-4" /> Transactions
        </button>
      </div>

      {/* Tab 1: Deposit */}
      {activeTab === "deposit" && (
        <div className="space-y-6">
          {/* Promoted Partner Products */}
          <div
            className={`p-5 sm:p-6 rounded-3xl border space-y-4 ${
              isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-slate-950"}`}>
                <Zap className="w-4 h-4 text-[#40b020]" /> Products From Our Partners
              </h3>
              <span className="text-[10px] font-bold text-[#40b020] bg-[#40b020]/15 px-2.5 py-0.5 rounded-full">
                {PROMOTED_PARTNER_PRODUCTS.length} Featured
              </span>
            </div>

            <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Select a verified clean energy product from our partners to sponsor & promote. Your sponsorship funds daily yield rewards credited directly to your wallet.
            </p>

            <div className="space-y-3">
              {PROMOTED_PARTNER_PRODUCTS.map((prod) => {
                const isSelected = selectedProductId === prod.id;
                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setSelectedProductId(prod.id);
                      setDepositAmount(prod.amount);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 shadow-xs ${
                      isSelected
                        ? isDark
                          ? "border-[#40b020] bg-slate-900 shadow-md shadow-[#40b020]/15 ring-1 ring-[#40b020]"
                          : "border-[#40b020] bg-emerald-50/70 shadow-md shadow-[#40b020]/15 ring-1 ring-[#40b020]"
                        : isDark
                        ? "border-slate-800 bg-slate-900/80 hover:border-slate-700"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-slate-200/50 dark:border-slate-700/50 shadow-xs">
                      <Image
                        src={prod.image}
                        alt={prod.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] uppercase font-bold tracking-tight ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {prod.partner}
                        </span>
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-[#40b020] bg-[#40b020]/15 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            {prod.badge}
                          </span>
                        )}
                      </div>

                      <h4 className={`text-xs font-bold truncate leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                        {prod.title}
                      </h4>

                      <div className="text-[10px] text-slate-400 truncate">
                        {prod.specs}
                      </div>

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-xs font-black text-[#40b020]">
                          ₦{prod.amount.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          +₦{prod.dailyReward.toLocaleString()}/day
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Official Platform Payment Destination Reference */}
            {(() => {
              const activeAcc = platformAccounts[0];
              const bankName = activeAcc?.bankName || activeAcc?.provider || "Wema Bank / PalmPay";
              const accNum = activeAcc?.accountNumber || "0123456789";
              const accName = activeAcc?.accountName || "SPEED PAY GLOBAL TECH LTD";

              return (
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 transition ${
                    isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Official Deposit Account
                    </span>
                    <span className="text-[10px] font-bold text-sky-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified Platform Payout
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-bold block ${isDark ? "text-white" : "text-slate-900"}`}>
                        {bankName}
                      </span>
                      <span className="text-sm font-mono font-black text-[#40b020]">
                        {accNum}
                      </span>
                      <span className={`text-[10px] block font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {accName}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(accNum, "official-acc")}
                      className="px-3 py-1.5 rounded-xl bg-[#40b020] text-slate-950 text-xs font-bold hover:bg-[#50b020] transition shadow-xs cursor-pointer"
                    >
                      {copiedText === "official-acc" ? "Copied!" : "Copy Account"}
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Payments are verified and credited directly to your wallet balance.</span>
            </div>
          </div>

          {/* Deposit Form */}
          <div
            className={`p-6 rounded-3xl border ${
              isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            {depositSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#40b020]/20 text-[#40b020] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-950"}`}>Payment Proof Submitted!</h3>
                <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  Your deposit has been queued for verification. Our finance team will review the transaction reference and credit your balance promptly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDepositSuccess(false);
                    setActiveTab("transactions");
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold mt-2 transition ${
                    isDark ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  View Transactions
                </button>
              </div>
            ) : (
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-950"}`}>Submit Payment Details</h3>

                {depositError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{depositError}</span>
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Deposit Amount (₦) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className={`w-full p-3 rounded-xl border text-sm font-bold focus:outline-none focus:border-[#40b020] ${
                      isDark
                        ? "bg-slate-900/90 border-slate-800 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                {/* Presets */}
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition ${
                        depositAmount === amt
                          ? "bg-[#40b020] text-slate-950 font-bold shadow-xs"
                          : isDark
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      ₦{amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                </div>

                {/* Transaction ID */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Transaction ID / Transfer Reference *
                  </label>
                  <input
                    type="text"
                    value={senderTransactionId}
                    onChange={(e) => setSenderTransactionId(e.target.value)}
                    placeholder="Paste your bank session ID or transfer ref"
                    className={`w-full p-3 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#40b020] ${
                      isDark
                        ? "bg-slate-900/90 border-slate-800 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                {/* Optional Sender Name */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Sender / Depositor Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Account name transferred from"
                    className={`w-full p-3 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#40b020] ${
                      isDark
                        ? "bg-slate-900/90 border-slate-800 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Upload Payment Receipt (Optional if TX ID provided)
                  </label>
                  <div
                    className={`rounded-xl border border-dashed p-3 text-center ${
                      isDark
                        ? "border-slate-700 bg-slate-900/60"
                        : "border-slate-300 bg-slate-50"
                    }`}
                  >
                    {receiptUrl ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#40b020] truncate max-w-[200px]">
                          ✓ {receiptFileName || "Receipt uploaded"}
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
                          <span>📎 Click to attach receipt image or PDF</span>
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

                <button
                  type="submit"
                  disabled={depositing || uploadingReceipt}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#40b020] hover:bg-[#50b020] text-slate-950 font-bold text-xs shadow-lg shadow-[#40b020]/25 transition disabled:opacity-50"
                >
                  {depositing ? "Submitting Proof..." : `Submit Deposit (₦${Number(depositAmount).toLocaleString()})`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Withdraw */}
      {activeTab === "withdraw" && (
        <div
          className={`max-w-xl mx-auto p-6 sm:p-8 rounded-3xl border space-y-5 ${
            isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}
        >
          {/* Server Overload Notice or Normal Hours Notice */}
          {!withdrawalsEnabled ? (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <div className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-950"}`}>Payout System Notice</div>
                <p className="mt-0.5 text-amber-500">Server overload wait for a few moment</p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <strong>Withdrawal Hours:</strong> Mon–Fri 8:00 AM – 5:00 PM WAT. Payouts are processed directly to your saved bank account.
              </div>
            </div>
          )}

          {withdrawSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#40b020]/20 text-[#40b020] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-950"}`}>Withdrawal Request Placed!</h3>
              <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Your withdrawal of ₦{Number(withdrawAmount).toLocaleString()} has been queued. You will receive an alert once credit is completed.
              </p>
              <button
                onClick={() => {
                  setWithdrawSuccess(false);
                  setActiveTab("transactions");
                }}
                className={`py-3 px-6 rounded-xl text-xs font-semibold transition ${
                  isDark ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                Check Transaction History
              </button>
            </div>
          ) : (
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {withdrawError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {/* Select Payout Bank Account */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Payout Bank Account
                  </label>
                  <Link
                    href="/profile#bank"
                    className="text-xs text-[#40b020] hover:underline font-semibold"
                  >
                    + Add Bank Account
                  </Link>
                </div>

                {payoutAccounts.length === 0 ? (
                  <div
                    className={`p-4 rounded-xl border text-center space-y-2 ${
                      isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>No bank account saved yet.</p>
                    <Link
                      href="/profile"
                      className="inline-block py-2 px-3 rounded-lg bg-[#40b020] text-slate-950 font-bold text-xs"
                    >
                      Bind Bank Account Now
                    </Link>
                  </div>
                ) : (
                  <select
                    value={selectedPayoutId}
                    onChange={(e) => setSelectedPayoutId(e.target.value)}
                    className={`w-full p-3 rounded-xl border text-xs font-semibold focus:outline-none focus:border-[#40b020] ${
                      isDark
                        ? "bg-slate-900/90 border-slate-800 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    {payoutAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountNumber} ({acc.accountName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount Presets */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Withdrawal Amount (₦)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {WITHDRAWAL_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWithdrawAmount(amt)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition ${
                        withdrawAmount === amt
                          ? "bg-[#40b020] text-slate-950 font-bold shadow-xs"
                          : isDark
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4-Digit PIN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    4–6 Digit Withdrawal PIN
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    {hasPin && (
                      <Link
                        href="/profile?action=reset-pin#pin-card"
                        className={`transition font-medium ${isDark ? "text-slate-400 hover:text-[#40b020]" : "text-slate-500 hover:text-[#40b020]"}`}
                      >
                        Forgot PIN?
                      </Link>
                    )}
                    <Link
                      href="/profile#pin-card"
                      className="text-[#40b020] hover:underline font-semibold"
                    >
                      {hasPin ? "Change PIN" : "Set PIN Now"}
                    </Link>
                  </div>
                </div>

                {!hasPin && (
                  <div className="mb-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center justify-between gap-2">
                    <span>⚠️ You have not configured your withdrawal PIN yet.</span>
                    <Link
                      href="/profile#pin-card"
                      className="px-2.5 py-1 rounded-lg bg-[#40b020] text-slate-950 font-bold text-[11px] whitespace-nowrap shrink-0"
                    >
                      Set PIN
                    </Link>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={withdrawalPin}
                    onChange={(e) => setWithdrawalPin(e.target.value)}
                    placeholder="Enter PIN"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-bold tracking-widest focus:outline-none focus:border-[#40b020] ${
                      isDark
                        ? "bg-slate-900/90 border-slate-800 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={withdrawing || payoutAccounts.length === 0 || !hasPin || !withdrawalsEnabled}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs shadow-lg transition ${
                  !withdrawalsEnabled
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/30 cursor-not-allowed opacity-90"
                    : "bg-[#40b020] hover:bg-[#50b020] text-slate-950 shadow-[#40b020]/25 disabled:opacity-50"
                }`}
              >
                {!withdrawalsEnabled
                  ? "Server overload wait for a few moment"
                  : withdrawing
                  ? "Processing..."
                  : `Confirm Withdrawal (₦${Number(withdrawAmount).toLocaleString()})`}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tab 3: Transactions */}
      {activeTab === "transactions" && (
        <div
          className={`p-6 rounded-3xl border space-y-4 ${
            isDark ? "glass-panel border-slate-800/80 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-950"}`}>All Transactions</h3>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["ALL", "CREDIT", "DEBIT", "COMMISSION", "TASK"].map((f) => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    txFilter === f
                      ? "bg-[#40b020] text-slate-950 font-bold shadow-xs"
                      : isDark
                      ? "bg-slate-800 text-slate-400 hover:text-white"
                      : "bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className={`text-center py-12 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              No transactions found.
            </div>
          ) : (
            <div className={`divide-y ${isDark ? "divide-slate-800/80" : "divide-slate-100"}`}>
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                        tx.direction === "CREDIT"
                          ? "bg-[#40b020]/15 text-[#40b020]"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {tx.direction === "CREDIT" ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {tx.description || tx.type}
                      </div>
                      <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-bold ${
                        tx.direction === "CREDIT"
                          ? "text-[#40b020]"
                          : isDark
                          ? "text-white"
                          : "text-slate-900"
                      }`}
                    >
                      {tx.direction === "CREDIT" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
                    </div>
                    <div className={`text-[10px] uppercase font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {tx.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="text-center text-slate-400 py-10">Loading Wallet...</div>}>
      <WalletContent />
    </Suspense>
  );
}
