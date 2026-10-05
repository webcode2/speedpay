"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Wallet,
  Coins,
  CheckSquare,
  Building2,
  Crown,
  ChevronRight,
  CreditCard,
  Users,
  Headphones,
  Smartphone,
  HelpCircle,
  Zap,
  Info,
  KeyRound,
  Lock,
  LogOut,
  X,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { useUser } from "@/components/user-context";

type PayoutAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
};

export default function ProfilePage() {
  const { user, wallet, activePlan, taskSummary, logout, theme } = useUser();
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const isDark = theme === "dark";

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    | null
    | "personal"
    | "invite"
    | "payment"
    | "workgroup"
    | "download"
    | "help"
    | "partners"
    | "about"
    | "pin"
    | "password"
  >(null);

  // Bank Form State
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankSuccess, setBankSuccess] = useState<string | null>(null);

  // PIN Form State
  const [hasPin, setHasPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // PIN Reset via OTP & Password State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resettingPin, setResettingPin] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const fetchBankAccountsAndPin = async () => {
    try {
      const [bankRes, pinRes] = await Promise.all([
        fetch("/api/payout-accounts").then((r) => r.json()).catch(() => null),
        fetch("/api/withdrawal-pin").then((r) => r.json()).catch(() => null),
      ]);

      if (bankRes?.success && Array.isArray(bankRes.data?.items)) {
        setPayoutAccounts(bankRes.data.items);
      }

      if (pinRes?.success && pinRes.data?.hasPin !== undefined) {
        setHasPin(Boolean(pinRes.data.hasPin));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccountsAndPin();
  }, []);

  const copyInvite = () => {
    if (!user?.referralCode) return;
    navigator.clipboard.writeText(user.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setBankError(null);
    setBankSuccess(null);

    try {
      const res = await fetch("/api/payout-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, accountNumber, accountName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBankError(data.error?.message || "Failed to add bank account");
      } else {
        setBankSuccess("Bank account added successfully!");
        setBankName("");
        setAccountNumber("");
        setAccountName("");
        fetchBankAccountsAndPin();
      }
    } catch {
      setBankError("Network error. Please try again.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPin(true);
    setPinError(null);
    setPinSuccess(null);

    if (pin !== confirmPin) {
      setPinError("New PIN and confirmation PIN do not match");
      setSavingPin(false);
      return;
    }

    try {
      const res = await fetch("/api/withdrawal-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, currentPin: hasPin ? currentPin : undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPinError(data.error?.message || "Failed to save withdrawal PIN");
      } else {
        setPinSuccess(hasPin ? "PIN updated successfully!" : "PIN set successfully!");
        setHasPin(true);
        setCurrentPin("");
        setPin("");
        setConfirmPin("");
      }
    } catch {
      setPinError("Network error. Please try again.");
    } finally {
      setSavingPin(false);
    }
  };

  const handleSendResetOtp = async () => {
    setSendingOtp(true);
    setResetError(null);
    setOtpMessage(null);
    setDevOtp(null);

    try {
      const res = await fetch("/api/withdrawal-pin/reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setResetError(data.error?.message || "Failed to send OTP");
      } else {
        setOtpSent(true);
        setOtpMessage(data.data?.message || "OTP sent to your registered email");
        if (data.data?.devOtp) {
          setDevOtp(data.data.devOtp);
          setResetOtp(data.data.devOtp);
        }
      }
    } catch {
      setResetError("Network error. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResettingPin(true);
    setResetError(null);
    setResetSuccess(null);

    if (resetNewPin !== resetConfirmPin) {
      setResetError("New PIN and confirmation PIN do not match");
      setResettingPin(false);
      return;
    }

    try {
      const res = await fetch("/api/withdrawal-pin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: resetPassword,
          otp: resetOtp,
          newPin: resetNewPin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setResetError(data.error?.message || "Failed to reset withdrawal PIN");
      } else {
        setResetSuccess("Withdrawal PIN successfully reset!");
        setHasPin(true);
        setResetPassword("");
        setResetOtp("");
        setResetNewPin("");
        setResetConfirmPin("");
        setIsResetMode(false);
      }
    } catch {
      setResetError("Network error. Please try again.");
    } finally {
      setResettingPin(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPass(true);
    setPassError(null);
    setPassSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPassError("New passwords do not match");
      setSavingPass(false);
      return;
    }

    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPassError(data.error?.message || "Failed to update password");
      } else {
        setPassSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch {
      setPassError("Network error. Please try again.");
    } finally {
      setSavingPass(false);
    }
  };

  const memberTier = activePlan?.planName || "Intern";
  const userIdentifier = user?.email?.split("@")[0] || "8128995823";

  return (
    <div className="space-y-4 pb-6 animate-fade-in">
      {/* 1. Main User Profile Card */}
      <div
        className={`rounded-3xl p-4 shadow-md space-y-4 border transition-colors ${
          isDark
            ? "bg-slate-900/95 border-slate-800/90 text-white shadow-xl"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        {/* User Header */}
        <Link
          href="/profile/personal"
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#002060] via-[#10356c] to-[#40b020] p-[2px] shadow-md flex items-center justify-center shrink-0">
              <div
                className={`w-full h-full rounded-full flex items-center justify-center ${
                  isDark ? "bg-[#0a0f1d] text-[#40b020]" : "bg-sky-400 text-white"
                }`}
              >
                <User className="w-6 h-6" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-base font-black font-mono ${
                    isDark ? "text-white" : "text-slate-950"
                  }`}
                >
                  {userIdentifier}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isDark
                      ? "bg-[#40b020]/20 text-[#40b020] border border-[#40b020]/40"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {memberTier}
                </span>
              </div>
              <p
                className={`text-xs truncate max-w-[200px] ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {user?.email || "user@solar.local"}
              </p>
            </div>
          </div>

          <ChevronRight
            className={`w-5 h-5 transition-transform group-hover:translate-x-0.5 ${
              isDark
                ? "text-slate-400 group-hover:text-white"
                : "text-slate-400 group-hover:text-slate-700"
            }`}
          />
        </Link>

        {/* 4 Stats Metrics */}
        <div
          className={`grid grid-cols-4 gap-2 pt-3 border-t text-center ${
            isDark ? "border-slate-800" : "border-slate-100"
          }`}
        >
          {/* Balance */}
          <div className="space-y-0.5">
            <div
              className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center ${
                isDark
                  ? "bg-slate-800 border border-slate-700/60 text-[#40b020]"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="text-[9px] text-slate-400 font-semibold uppercase">NGN</div>
            <div
              className={`text-xs font-black leading-tight font-mono ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {wallet
                ? Number(wallet.availableBalance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })
                : "0.00"}
            </div>
            <div
              className={`text-[10px] font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Balance
            </div>
          </div>

          {/* Commission */}
          <div className="space-y-0.5">
            <div
              className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center ${
                isDark
                  ? "bg-slate-800 border border-slate-700/60 text-amber-400"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div className="text-[9px] text-slate-400 font-semibold uppercase">NGN</div>
            <div
              className={`text-xs font-black leading-tight font-mono ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {wallet
                ? Number(wallet.totalCommission || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })
                : "0.00"}
            </div>
            <div
              className={`text-[10px] font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Commission
            </div>
          </div>

          {/* Completed */}
          <div className="space-y-0.5">
            <div
              className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center ${
                isDark
                  ? "bg-slate-800 border border-slate-700/60 text-sky-400"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
            <div className="text-[9px] text-slate-400 font-semibold uppercase">Tasks</div>
            <div
              className={`text-xs font-black leading-tight font-mono ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {taskSummary?.completed ?? 0}
            </div>
            <div
              className={`text-[10px] font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Completed
            </div>
          </div>

          {/* Withdrawn */}
          <div className="space-y-0.5">
            <div
              className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center ${
                isDark
                  ? "bg-slate-800 border border-slate-700/60 text-emerald-400"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-[9px] text-slate-400 font-semibold uppercase">NGN</div>
            <div
              className={`text-xs font-black leading-tight font-mono ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {wallet
                ? Number(wallet.totalWithdrawn || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })
                : "0.00"}
            </div>
            <div
              className={`text-[10px] font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Withdrawn
            </div>
          </div>
        </div>

        {/* 2 Big Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Link
            href="/wallet?tab=deposit"
            className={`flex items-center justify-center py-2.5 px-4 rounded-2xl font-bold text-xs shadow-md transition active:scale-98 ${
              isDark
                ? "bg-gradient-to-r from-[#002060] to-[#10356c] text-white border border-[#40b020]/40 hover:opacity-95"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            Recharge
          </Link>
          <Link
            href="/withdraw"
            className={`flex items-center justify-center py-2.5 px-4 rounded-2xl font-bold text-xs border transition active:scale-98 ${
              isDark
                ? "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700"
                : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200"
            }`}
          >
            Withdraw
          </Link>
        </div>
      </div>

      {/* 2. VIP / Plan Upgrade Card */}
      <div
        className={`relative rounded-3xl p-4 shadow-md overflow-hidden border transition-colors ${
          isDark
            ? "bg-gradient-to-r from-[#002060]/70 via-slate-900 to-slate-900 border-amber-500/30 text-white shadow-xl"
            : "bg-white border-slate-200 text-slate-900 shadow-sm"
        }`}
      >
        {/* Background Scenic Graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none">
          <img
            src="/images/solar_plant.jpg"
            alt="Scenic"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isDark
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                : "bg-slate-900 text-amber-400"
            }`}
          >
            <Crown className="w-5 h-5 fill-current" />
          </div>

          <div className="space-y-1">
            <h3
              className={`text-sm font-black capitalize ${
                isDark ? "text-white" : "text-slate-950"
              }`}
            >
              {memberTier}
            </h3>
            <p
              className={`text-[11px] leading-tight pr-4 ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Upgrade to higher tier solar plans to unlock up to ₦34,000 daily earnings & priority payouts.
            </p>
            <Link
              href="/packages"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#40b020] hover:underline pt-1"
            >
              <span>View benefits</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. More Navigation Grid */}
      <div className="space-y-2.5 pt-1">
        <h3
          className={`text-xs font-black px-1 ${
            isDark ? "text-slate-200" : "text-slate-900"
          }`}
        >
          More
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. Personal Information */}
          <Link
            href="/profile/personal"
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#40b020]" />
              <span className="text-xs font-bold leading-tight">
                Personal<br />Information
              </span>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                isDark
                  ? "text-slate-500 group-hover:text-white"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </Link>

          {/* 2. Invite Friends */}
          <Link
            href="/invite"
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold">Invite Friends</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                isDark
                  ? "text-slate-500 group-hover:text-white"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </Link>

          {/* 3. Payment Methods */}
          <Link
            href="/payment-methods"
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">Payment Methods</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                isDark
                  ? "text-slate-500 group-hover:text-white"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </Link>

          {/* 4. Customer Care */}
          <Link
            href="/support"
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold">Customer Care</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                isDark
                  ? "text-slate-500 group-hover:text-white"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </Link>

          {/* 5. Download App */}
          <button
            type="button"
            onClick={() => setActiveModal("download")}
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold">Download App</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                isDark
                  ? "text-slate-500 group-hover:text-white"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </button>

          {/* 6. Help Center */}
          <button
            type="button"
            onClick={() => setActiveModal("help")}
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold">Help Center</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                isDark
                  ? "text-slate-500 group-hover:text-white"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </button>

          {/* 7. Partners */}
          <button
            type="button"
            onClick={() => setActiveModal("partners")}
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-bold">Partners</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                isDark
                  ? "text-slate-500 group-hover:text-white"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </button>

          {/* 8. About Us */}
          <button
            type="button"
            onClick={() => setActiveModal("about")}
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold">About Us</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                isDark
                  ? "text-slate-500 group-hover:text-white"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </button>

          {/* 9. Withdrawal PIN */}
          <button
            type="button"
            onClick={() => setActiveModal("pin")}
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#40b020]" />
              <span className="text-xs font-bold leading-tight">
                Withdrawal<br />PIN
              </span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                isDark
                  ? "bg-[#40b020]/20 text-[#40b020] border-[#40b020]/30"
                  : "bg-[#40b020]/15 text-[#40b020] border-[#40b020]/30"
              }`}
            >
              {hasPin ? "Set" : "Not Set"}
            </span>
          </button>

          {/* 10. Security Password */}
          <button
            type="button"
            onClick={() => setActiveModal("password")}
            className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-xs text-left transition group active:scale-98 ${
              isDark
                ? "bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-[#40b020]/40 text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold leading-tight">
                Change<br />Password
              </span>
            </div>
            <ChevronRight
              className={`w-4 h-4 ${
                isDark
                  ? "text-slate-500 group-hover:text-white"
                  : "text-slate-400 group-hover:text-slate-700"
              }`}
            />
          </button>
        </div>

        {/* Log out button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs font-bold transition active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>

      {/* ===================== MODALS ===================== */}

      {/* 1. Personal Info Modal */}
      {activeModal === "personal" && (
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
                <User className="w-4 h-4 text-[#40b020]" /> Personal Information
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                className={`flex justify-between p-3 rounded-xl border ${
                  isDark
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="text-slate-400">User ID</span>
                <span className="font-mono font-bold">{user?.id?.slice(0, 8)}...</span>
              </div>
              <div
                className={`flex justify-between p-3 rounded-xl border ${
                  isDark
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="text-slate-400">Email</span>
                <span className="font-bold">{user?.email}</span>
              </div>
              <div
                className={`flex justify-between p-3 rounded-xl border ${
                  isDark
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="text-slate-400">Member Status</span>
                <span className="font-bold text-[#40b020] uppercase">{memberTier}</span>
              </div>
              <div
                className={`flex justify-between p-3 rounded-xl border ${
                  isDark
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="text-slate-400">Referral Code</span>
                <span className="font-mono font-bold text-[#40b020]">{user?.referralCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Invite Friends Modal */}
      {activeModal === "invite" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in text-center border ${
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
                <Users className="w-4 h-4 text-[#40b020]" /> Invite Friends
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p
              className={`text-xs ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Share your referral code with friends and earn up to <strong className="text-[#40b020]">10% Level-A commissions</strong> on every deposit!
            </p>

            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                isDark
                  ? "bg-slate-900 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <span className="text-[10px] text-slate-400 font-medium">YOUR INVITATION CODE</span>
              <div className="font-mono text-xl font-black text-[#40b020] tracking-widest">
                {user?.referralCode || "SP8820"}
              </div>
              <button
                type="button"
                onClick={copyInvite}
                className="w-full py-2 rounded-xl bg-[#40b020] hover:bg-[#389c1c] text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? "Copied to Clipboard!" : "Copy Invite Code"}</span>
              </button>
            </div>

            <Link
              href="/team"
              onClick={() => setActiveModal(null)}
              className="inline-block text-xs font-bold text-[#40b020] hover:underline"
            >
              View Full Team & Commission Hierarchy →
            </Link>
          </div>
        </div>
      )}

      {/* 3. Payment Methods (Payout Accounts) Modal */}
      {activeModal === "payment" && (
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
                <CreditCard className="w-4 h-4 text-[#40b020]" /> Payout Bank Accounts
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Accounts */}
            <div className="space-y-2">
              <span
                className={`text-xs font-bold ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Linked Bank Accounts
              </span>
              {payoutAccounts.length > 0 ? (
                payoutAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      isDark
                        ? "bg-slate-900 border-slate-800"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between font-bold">
                      <span>{acc.bankName}</span>
                      <span className="text-[#40b020] text-[10px]">{acc.status}</span>
                    </div>
                    <div className="font-mono text-[#40b020]">{acc.accountNumber}</div>
                    <div className="text-[10px] text-slate-400">{acc.accountName}</div>
                  </div>
                ))
              ) : (
                <div
                  className={`p-3 rounded-xl border text-center text-xs ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-slate-400"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  No bank account linked yet. Add one below for instant withdrawals.
                </div>
              )}
            </div>

            {/* Add Bank Form */}
            <form
              onSubmit={handleAddBank}
              className={`space-y-2.5 pt-2 border-t ${
                isDark ? "border-slate-800" : "border-slate-200"
              }`}
            >
              <span className="text-xs font-bold">Add New Bank Account</span>
              {bankError && <div className="p-2 rounded-xl bg-red-500/20 text-red-500 text-[11px]">{bankError}</div>}
              {bankSuccess && <div className="p-2 rounded-xl bg-[#40b020]/20 text-[#40b020] text-[11px]">{bankSuccess}</div>}

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Access Bank / OPay / Kuda"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#40b020] border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="10-digit NUBAN number"
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Account holder full name"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#40b020] border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={savingBank}
                className="w-full py-2.5 rounded-xl bg-[#40b020] hover:bg-[#389c1c] text-slate-950 font-black text-xs transition disabled:opacity-50"
              >
                {savingBank ? "Saving..." : "Save Bank Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Work Group Modal */}
      {activeModal === "workgroup" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in text-center border ${
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
                <Headphones className="w-4 h-4 text-[#40b020]" /> Official Work Groups
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p
              className={`text-xs ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Join our verified Telegram & WhatsApp community to receive daily gift codes, salary announcements, and solar maintenance news.
            </p>

            <div className="space-y-2 pt-1">
              <a
                href="https://t.me/solar_support"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-500 dark:text-sky-300 font-bold text-xs transition"
              >
                <span>Telegram Official Group</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <a
                href="https://wa.me/2348000000000"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-[#40b020]/15 hover:bg-[#40b020]/25 border border-[#40b020]/30 text-[#40b020] font-bold text-xs transition"
              >
                <span>WhatsApp VIP Group</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. Download App Modal */}
      {activeModal === "download" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in text-center border ${
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
                <Smartphone className="w-4 h-4 text-[#40b020]" /> Download Mobile App
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#002060] to-[#40b020] flex items-center justify-center text-white font-black text-xl shadow-lg">
              SP
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-black">SpeedPay APK v2.4</h4>
              <p className="text-xs text-slate-400">
                Install for instant task notifications, 1-tap PIN login, and faster payouts.
              </p>
            </div>

            <button
              type="button"
              onClick={() => alert("Downloading official SpeedPay Android APK package...")}
              className="w-full py-3 rounded-2xl bg-[#40b020] hover:bg-[#389c1c] text-slate-950 font-black text-xs transition shadow-lg"
            >
              Download Android APK
            </button>
          </div>
        </div>
      )}

      {/* 6. Help Center & FAQs Modal */}
      {activeModal === "help" && (
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
                <HelpCircle className="w-4 h-4 text-[#40b020]" /> Help Center & FAQ
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div
                className={`p-3 rounded-2xl border space-y-1 ${
                  isDark
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <h4 className="font-bold">How do daily tasks work?</h4>
                <p className="text-slate-400 text-[11px]">
                  Depending on your active solar package, you receive between 1 to 10 daily diagnostics. Each completed task credits your wallet balance immediately.
                </p>
              </div>

              <div
                className={`p-3 rounded-2xl border space-y-1 ${
                  isDark
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <h4 className="font-bold">When can I withdraw my earnings?</h4>
                <p className="text-slate-400 text-[11px]">
                  Withdrawals are open 24/7. Minimum withdrawal is ₦100. Payouts are reviewed and credited directly to your bank account.
                </p>
              </div>

              <div
                className={`p-3 rounded-2xl border space-y-1 ${
                  isDark
                    ? "bg-slate-900 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <h4 className="font-bold">How do team commissions work?</h4>
                <p className="text-slate-400 text-[11px]">
                  Level A invites earn you 10% instant rebate, Level B earns 2%, and Level C earns 1% on every solar package purchase.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Partners Modal */}
      {activeModal === "partners" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in text-center border ${
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
                <Zap className="w-4 h-4 text-[#40b020]" /> Clean Energy Partners
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p
              className={`text-xs ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              SpeedPay collaborates with premier regional photovoltaic microgrids and battery energy storage manufacturers.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
              <div
                className={`p-3 rounded-2xl border ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                ☀️ Huawei Solar
              </div>
              <div
                className={`p-3 rounded-2xl border ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                🔋 Sungrow Power
              </div>
              <div
                className={`p-3 rounded-2xl border ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                ⚡ Longi Green Energy
              </div>
              <div
                className={`p-3 rounded-2xl border ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                🏭 Jinko Solar Tech
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. About Us Modal */}
      {activeModal === "about" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-in text-center border ${
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
                <Info className="w-4 h-4 text-[#40b020]" /> About SpeedPay
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`space-y-2 text-xs text-left leading-relaxed ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <p>
                <strong>SPEED PAY GLOBAL TECH LTD</strong> is a certified renewable energy platform bridging retail members with utility-scale clean solar energy microgrids.
              </p>
              <p>
                By completing daily operational and yield verification tasks, members participate directly in distributed energy dividends with transparent blockchain-backed settlement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 9. Withdrawal PIN Modal */}
      {activeModal === "pin" && (
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
                <KeyRound className="w-4 h-4 text-[#40b020]" /> Withdrawal PIN Settings
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isResetMode ? (
              <form onSubmit={handleSetPin} className="space-y-3">
                <p
                  className={`text-xs ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {hasPin
                    ? "Change your 4–6 digit PIN used to authorize withdrawals."
                    : "Set a 4–6 digit security PIN required for all bank payouts."}
                </p>

                {pinError && <div className="p-2 rounded-xl bg-red-500/20 text-red-500 text-[11px]">{pinError}</div>}
                {pinSuccess && <div className="p-2 rounded-xl bg-[#40b020]/20 text-[#40b020] text-[11px]">{pinSuccess}</div>}

                {hasPin && (
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Current PIN</label>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      placeholder="••••"
                      className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">New 4–6 Digit PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Confirm PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="••••"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPin}
                  className="w-full py-2.5 rounded-xl bg-[#40b020] hover:bg-[#389c1c] text-slate-950 font-black text-xs transition disabled:opacity-50"
                >
                  {savingPin ? "Saving..." : hasPin ? "Update PIN" : "Set Withdrawal PIN"}
                </button>

                {hasPin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setPinError(null);
                    }}
                    className="w-full text-center text-[11px] font-bold text-amber-500 hover:underline pt-1"
                  >
                    Forgot PIN? Reset with Password & OTP
                  </button>
                )}
              </form>
            ) : (
              <form onSubmit={handleResetPinSubmit} className="space-y-3">
                <p
                  className={`text-xs ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  Reset your PIN using your account sign-in password and email verification OTP.
                </p>

                {resetError && <div className="p-2 rounded-xl bg-red-500/20 text-red-500 text-[11px]">{resetError}</div>}
                {resetSuccess && <div className="p-2 rounded-xl bg-[#40b020]/20 text-[#40b020] text-[11px]">{resetSuccess}</div>}
                {otpMessage && <div className="p-2 rounded-xl bg-sky-500/20 text-sky-500 text-[11px]">{otpMessage}</div>}

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Account Password</label>
                  <input
                    type="password"
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Your login password"
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#40b020] border ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-slate-400">Email OTP</label>
                    <button
                      type="button"
                      onClick={handleSendResetOtp}
                      disabled={sendingOtp}
                      className="text-[10px] text-[#40b020] font-bold hover:underline"
                    >
                      {sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">New 4–6 Digit PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={resetNewPin}
                    onChange={(e) => setResetNewPin(e.target.value)}
                    placeholder="••••"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Confirm New PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={resetConfirmPin}
                    onChange={(e) => setResetConfirmPin(e.target.value)}
                    placeholder="••••"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#40b020] border ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={resettingPin}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition disabled:opacity-50"
                >
                  {resettingPin ? "Resetting PIN..." : "Confirm PIN Reset"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsResetMode(false)}
                  className="w-full text-center text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white pt-1"
                >
                  Back to Standard PIN Change
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 10. Password Change Modal */}
      {activeModal === "password" && (
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
                <Lock className="w-4 h-4 text-[#40b020]" /> Change Password
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              {passError && <div className="p-2 rounded-xl bg-red-500/20 text-red-500 text-[11px]">{passError}</div>}
              {passSuccess && <div className="p-2 rounded-xl bg-[#40b020]/20 text-[#40b020] text-[11px]">{passSuccess}</div>}

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#40b020] border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">New Password (Min 12 Chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New strong password"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#40b020] border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#40b020] border ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={savingPass}
                className="w-full py-2.5 rounded-xl bg-[#40b020] hover:bg-[#389c1c] text-slate-950 font-black text-xs transition disabled:opacity-50"
              >
                {savingPass ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
