"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Wallet,
  Sparkles,
  Star,
  Sun,
  Factory,
  BatteryCharging,
  TrendingUp,
  X,
  Building2,
  TreePine,
  Flame,
} from "lucide-react";
import { useUser } from "@/components/user-context";

type Plan = {
  id: string;
  name: string;
  price: number;
  dailyTaskLimit: number;
  taskReward: number;
  durationDays: number;
  description: string;
};

const DEFAULT_PLANS: Plan[] = [
  { id: "p-12k", name: "12k", price: 12000, dailyTaskLimit: 1, taskReward: 400, durationDays: 30, description: "₦12,000 subscription · 1 task/day (₦400/task)" },
  { id: "p-54k", name: "54k", price: 54000, dailyTaskLimit: 2, taskReward: 900, durationDays: 30, description: "₦54,000 subscription · 2 tasks/day (₦900/task)" },
  { id: "p-89k", name: "89k", price: 89000, dailyTaskLimit: 3, taskReward: 1000, durationDays: 60, description: "₦89,000 subscription · 3 tasks/day (₦1,000/task)" },
  { id: "p-120k", name: "120k", price: 120000, dailyTaskLimit: 4, taskReward: 1000, durationDays: 60, description: "₦120,000 subscription · 4 tasks/day (₦1,000/task)" },
  { id: "p-200k", name: "200k", price: 200000, dailyTaskLimit: 5, taskReward: 1400, durationDays: 90, description: "₦200,000 subscription · 5 tasks/day (₦1,400/task)" },
];

const HERO_SLIDES = [
  {
    tag: "DISCOVER",
    title: "Invest in High-Yield Solar Infrastructure & Clean Tech.",
    subtitle: "Complete verified daily microgrid tasks to earn instant daily dividends.",
    image: "/images/solar_hero.jpg",
  },
  {
    tag: "SOLAR YIELD",
    title: "Earn Up to ₦34,000 Daily From Power Generation.",
    subtitle: "Automated daily task quotas with instant wallet settlement.",
    image: "/images/solar_plant.jpg",
  },
];

const CATEGORIES = [
  { name: "Residential", icon: Sun },
  { name: "Commercial", icon: Building2 },
  { name: "Industrial", icon: Factory },
  { name: "Microgrid", icon: BatteryCharging },
  { name: "Agri-PV", icon: TreePine },
  { name: "VIP Yield", icon: Flame },
];

type SettlementItem = {
  id: string;
  phone: string;
  amount: number;
  action: string;
  time: string;
};

const INITIAL_SETTLEMENTS: SettlementItem[] = [
  { id: "p1", phone: "080***9124", amount: 15000, action: "Withdrew", time: "Just now" },
  { id: "p2", phone: "090***3318", amount: 54000, action: "Activated Plan", time: "4s ago" },
  { id: "p3", phone: "081***7802", amount: 28500, action: "Task Earnings", time: "8s ago" },
  { id: "p4", phone: "070***4591", amount: 120000, action: "Withdrew", time: "12s ago" },
  { id: "p5", phone: "091***6643", amount: 10000, action: "Withdrew", time: "18s ago" },
];

const SETTLEMENT_AMOUNTS = [
  3500, 5000, 7500, 10000, 12000, 15000, 18000, 24000, 28500, 36000, 54000, 89000, 120000, 200000
];

const SETTLEMENT_ACTIONS = [
  "Withdrew",
  "Task Earnings",
  "Activated Plan",
  "Withdrew",
  "Commission",
  "Daily Yield",
  "Withdrew",
];

const NIGERIAN_PREFIXES = ["080", "090", "081", "070", "091", "080", "081"];

export default function DashboardPage() {
  const { theme, loading } = useUser();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [settlements, setSettlements] = useState<SettlementItem[]>(INITIAL_SETTLEMENTS);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("Residential");
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const isDark = theme === "dark";

  // Real-time animated settlement stream (new item every 3s)
  useEffect(() => {
    const interval = setInterval(() => {
      const prefix = NIGERIAN_PREFIXES[Math.floor(Math.random() * NIGERIAN_PREFIXES.length)] || "080";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const action = SETTLEMENT_ACTIONS[Math.floor(Math.random() * SETTLEMENT_ACTIONS.length)] || "Withdrew";
      const amount = SETTLEMENT_AMOUNTS[Math.floor(Math.random() * SETTLEMENT_AMOUNTS.length)] || 15000;

      const newItem: SettlementItem = {
        id: `settle-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        phone: `${prefix}***${randomSuffix}`,
        action,
        amount,
        time: "Just now",
      };

      setSettlements((prev) => {
        const updated = prev.map((item, idx) => {
          if (idx === 0) return { ...item, time: "3s ago" };
          if (idx === 1) return { ...item, time: "7s ago" };
          if (idx === 2) return { ...item, time: "14s ago" };
          if (idx === 3) return { ...item, time: "1m ago" };
          return { ...item, time: `${idx + 1}m ago` };
        });
        return [newItem, ...updated.slice(0, 4)];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Auto-rotate hero banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch investment plans (parses items or plans, hydrates instant state)
  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        const items = d.data?.items || d.data?.plans;
        if (d.success && Array.isArray(items) && items.length > 0) {
          setPlans(items);
        }
      })
      .catch(() => {});
  }, []);

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setSpinResult(null);

    setTimeout(() => {
      const prizes = ["₦500 Bonus Credit", "₦1,000 Extra Task Reward", "+1 Free Task Token", "₦2,000 Wallet Bonus"];
      const win = prizes[Math.floor(Math.random() * prizes.length)] || "₦500 Bonus Credit";
      setSpinResult(win);
      setSpinning(false);
    }, 2800);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[65vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#40b020] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Speed Pay...</p>
        </div>
      </div>
    );
  }

  const slide = HERO_SLIDES[currentSlide] ?? HERO_SLIDES[0]!;

  return (
    <div className="space-y-4 pb-4 animate-fade-in">
      {/* 1. Notice Announcement Bar */}
      <div
        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs overflow-hidden shadow-xs transition-colors ${
          isDark
            ? "bg-slate-900/90 border border-slate-800 text-white"
            : "bg-slate-100/90 border border-slate-200 text-slate-800"
        }`}
      >
        <div className="flex items-center gap-1.5 text-[#40b020] font-bold shrink-0">
          <Megaphone className="w-3.5 h-3.5 text-[#40b020]" />
          <span>Notice</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div
            className={`animate-marquee whitespace-nowrap font-medium text-[11px] ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            ⚡ Official Announcement: Solar daily task reward cycle is active · Instant 24/7 bank transfers & withdrawals verified within 15 minutes · Invite friends for 10% instant rebate!
          </div>
        </div>
        <Link
          href="/notifications"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. Hero Banner Carousel */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800/40 group h-56 bg-slate-950">
        {/* Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.image}
          alt="Solar Infrastructure"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-widest text-white uppercase border border-white/30">
              {slide.tag}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-black text-white leading-tight drop-shadow-md">
              {slide.title}
            </h2>
            <p className="text-[11px] text-slate-200 line-clamp-2 drop-shadow">
              {slide.subtitle}
            </p>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1.5 pt-1.5">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentSlide ? "w-6 bg-[#40b020]" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Four Quick Action Buttons Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Recharge / Deposit */}
        <Link
          href="/wallet?tab=deposit"
          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all group shadow-xs active:scale-95 border ${
            isDark
              ? "bg-slate-900/90 border-slate-800/90 hover:border-[#40b020]/50"
              : "bg-slate-50 border-slate-200/90 hover:border-[#40b020]/50"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition border ${
              isDark
                ? "bg-slate-800/80 border-slate-700/80 text-slate-200 group-hover:text-[#40b020] group-hover:bg-[#40b020]/10"
                : "bg-white border-slate-200 text-slate-800 group-hover:text-[#40b020] group-hover:border-[#40b020]/40 shadow-xs"
            }`}
          >
            <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[11px] font-bold mt-1.5 tracking-tight ${
              isDark ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-950"
            }`}
          >
            Recharge
          </span>
        </Link>

        {/* Withdraw */}
        <Link
          href="/withdraw"
          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all group shadow-xs active:scale-95 border ${
            isDark
              ? "bg-slate-900/90 border-slate-800/90 hover:border-[#40b020]/50"
              : "bg-slate-50 border-slate-200/90 hover:border-[#40b020]/50"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition border ${
              isDark
                ? "bg-slate-800/80 border-slate-700/80 text-slate-200 group-hover:text-[#40b020] group-hover:bg-[#40b020]/10"
                : "bg-white border-slate-200 text-slate-800 group-hover:text-[#40b020] group-hover:border-[#40b020]/40 shadow-xs"
            }`}
          >
            <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[11px] font-bold mt-1.5 tracking-tight ${
              isDark ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-950"
            }`}
          >
            Withdraw
          </span>
        </Link>

        {/* Invite / Team */}
        <Link
          href="/team"
          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all group shadow-xs active:scale-95 border ${
            isDark
              ? "bg-slate-900/90 border-slate-800/90 hover:border-[#40b020]/50"
              : "bg-slate-50 border-slate-200/90 hover:border-[#40b020]/50"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition border ${
              isDark
                ? "bg-slate-800/80 border-slate-700/80 text-slate-200 group-hover:text-[#40b020] group-hover:bg-[#40b020]/10"
                : "bg-white border-slate-200 text-slate-800 group-hover:text-[#40b020] group-hover:border-[#40b020]/40 shadow-xs"
            }`}
          >
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[11px] font-bold mt-1.5 tracking-tight ${
              isDark ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-950"
            }`}
          >
            Invite
          </span>
        </Link>

        {/* Assets / Packages */}
        <Link
          href="/packages"
          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all group shadow-xs active:scale-95 border ${
            isDark
              ? "bg-slate-900/90 border-slate-800/90 hover:border-[#40b020]/50"
              : "bg-slate-50 border-slate-200/90 hover:border-[#40b020]/50"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition border ${
              isDark
                ? "bg-slate-800/80 border-slate-700/80 text-slate-200 group-hover:text-[#40b020] group-hover:bg-[#40b020]/10"
                : "bg-white border-slate-200 text-slate-800 group-hover:text-[#40b020] group-hover:border-[#40b020]/40 shadow-xs"
            }`}
          >
            <Wallet className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[11px] font-bold mt-1.5 tracking-tight ${
              isDark ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-950"
            }`}
          >
            Assets
          </span>
        </Link>
      </div>

      {/* 4. Browse by Category */}
      <div className="space-y-2 pt-1">
        <h3
          className={`text-xs font-black ${
            isDark ? "text-slate-200" : "text-slate-900"
          }`}
        >
          Browse by Category
        </h3>
        <div className="grid grid-cols-6 gap-1.5">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const isSelected = selectedCategory === c.name;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedCategory(c.name)}
                className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition border ${
                  isSelected
                    ? "bg-[#40b020]/15 text-[#40b020] border-[#40b020]/40 font-bold"
                    : isDark
                    ? "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] mt-1 font-medium truncate w-full text-center">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Lucky Draw Wheel Banner Card */}
      <div
        className={`relative rounded-2xl border p-3 flex items-center justify-between shadow-md overflow-hidden ${
          isDark
            ? "bg-gradient-to-r from-amber-500/15 via-slate-900 to-[#002060]/40 border-amber-500/30 text-white"
            : "bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 border-amber-200 text-slate-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/lucky_wheel.png"
              alt="Lucky Spin"
              className="w-full h-full object-cover animate-spin-slow"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-600 dark:text-amber-300 uppercase tracking-wider">
                Lucky Spin Jackpot
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-600 dark:text-amber-300 text-[9px] font-bold">
                Daily
              </span>
            </div>
            <p
              className={`text-[10px] ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Spin & win up to <strong className="font-bold">₦50,000</strong> instant bonus!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSpinModal(true)}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition shrink-0 active:scale-95"
        >
          Spin Now
        </button>
      </div>

      {/* 6. Recommended Solar Projects */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <h3
            className={`text-xs font-black flex items-center gap-1.5 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            <span>Recommended Solar Projects</span>
          </h3>
          <Link
            href="/packages"
            className="text-[11px] font-bold text-[#40b020] hover:underline flex items-center gap-0.5"
          >
            <span>See all</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {plans.length > 0 ? (
            plans.slice(0, 5).map((p) => {
              const dailyEarnings = p.dailyTaskLimit * p.taskReward;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border transition space-y-2.5 shadow-xs ${
                    isDark
                      ? "bg-slate-900/90 border-slate-800/90 hover:border-[#40b020]/40 text-white"
                      : "bg-white border-slate-200 hover:border-[#40b020]/40 text-slate-900 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#002060] to-[#40b020] flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs">
                        {p.name.toUpperCase()}
                      </div>
                      <div>
                        <div
                          className={`text-xs font-bold flex items-center gap-1.5 ${
                            isDark ? "text-white" : "text-slate-950"
                          }`}
                        >
                          <span>Solar Project {p.name}</span>
                        </div>
                        {/* Rating Stars */}
                        <div className="flex items-center gap-0.5 mt-0.5 text-amber-400">
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-[10px] text-slate-400 ml-1">5.0</span>
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {p.durationDays} Days · {p.dailyTaskLimit} task{p.dailyTaskLimit > 1 ? "s" : ""}/day (₦{p.taskReward.toLocaleString()})
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-[#40b020]">
                        ₦{Number(p.price).toLocaleString()}
                      </div>
                      <div
                        className={`text-[9px] ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Subscription
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between pt-2 border-t text-[11px] ${
                      isDark ? "border-slate-800" : "border-slate-100"
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-[#40b020]" />
                      <span>
                        Daily Yield:{" "}
                        <strong
                          className={isDark ? "text-white" : "text-slate-950"}
                        >
                          ₦{dailyEarnings.toLocaleString()}
                        </strong>
                      </span>
                    </div>

                    <Link
                      href="/packages"
                      className="px-3 py-1 rounded-xl bg-[#40b020]/15 hover:bg-[#40b020]/25 text-[#40b020] font-bold text-xs border border-[#40b020]/30 transition"
                    >
                      Subscribe
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              className={`p-4 rounded-2xl border text-center text-xs ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-400"
                  : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              Loading solar packages...
            </div>
          )}
        </div>
      </div>

      {/* 7. Live Settlement Stream */}
      <div
        className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
          isDark
            ? "bg-slate-900/60 border-slate-800/80"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <div
          className={`flex items-center justify-between text-xs font-bold ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#40b020] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#40b020]"></span>
            </span>
            Live Settlement Stream
          </span>
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Real-time
          </span>
        </div>

        <div className="space-y-1 overflow-hidden">
          {settlements.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg border-b last:border-0 transition-all duration-300 ${
                idx === 0
                  ? "animate-settlement-entry font-medium"
                  : ""
              } ${
                isDark ? "border-slate-800/50" : "border-slate-200/60"
              }`}
            >
              <span className="text-slate-400 font-mono">{item.phone}</span>
              <span className={isDark ? "text-slate-300" : "text-slate-600"}>
                {item.action}
              </span>
              <span className="font-bold text-[#40b020]">
                ₦{item.amount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lucky Spin Modal */}
      {showSpinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div
            className={`w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-scale-in border ${
              isDark
                ? "bg-[#0f172a] border-amber-500/30 text-white"
                : "bg-white border-amber-300 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Lucky Spin Daily Bonus
              </h3>
              <button
                onClick={() => {
                  setShowSpinModal(false);
                  setSpinResult(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Wheel graphic */}
            <div className="relative w-36 h-36 mx-auto my-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/lucky_wheel.png"
                alt="Roulette"
                className={`w-full h-full object-contain ${
                  spinning ? "animate-spin duration-500" : ""
                }`}
              />
            </div>

            {spinResult && (
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-600 dark:text-amber-300 animate-bounce-subtle">
                🎉 Congratulations! You won <br />
                <span className="text-slate-900 dark:text-white text-sm font-black">
                  {spinResult}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition disabled:opacity-50"
            >
              {spinning ? "Spinning..." : "SPIN NOW"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
