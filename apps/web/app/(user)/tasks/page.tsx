"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckSquare,
  Star,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ArrowRight,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUser } from "@/components/user-context";

type TaskItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  rewardAmount?: number;
  imageUrl?: string | null;
  completedToday: boolean;
};

type TaskData = {
  eligible: boolean;
  reason?: string;
  dailyLimit: number;
  completedToday: number;
  remaining: number;
  rewardPerTask: number;
  earnedToday: number;
  currency: string;
  categories: string[];
  items: TaskItem[];
};

export default function TasksPage() {
  const { activePlan, refreshUserData, theme } = useUser();
  const isDark = theme === "dark";
  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedReward, setCompletedReward] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 3;

  const fetchTasks = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/tasks/today");
      const json = await res.json();
      if (json.success && json.data?.tasks) {
        setTaskData(json.data.tasks);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/tasks/items/${selectedTask.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: rating, comment: comment.trim() || undefined }),
      });
      const json = await res.json();

      if (!json.success) {
        setSubmitError(json.error?.message || "Failed to complete task.");
        return;
      }

      setCompletedReward(json.data?.result?.rewardEarned ?? taskData?.rewardPerTask ?? 0);
      await fetchTasks();
      await refreshUserData();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedTask(null);
    setRating(5);
    setComment("");
    setSubmitError(null);
    setCompletedReward(null);
  };

  const isEligible = taskData ? taskData.eligible : Boolean(activePlan);
  const allowedLimit = taskData?.dailyLimit ?? activePlan?.dailyTasks ?? 0;

  const filteredTasks = taskData?.items ?? [];

  // Enforce plan quota: user is only allowed to see only the amount of tasks their plan carries
  const quotaTasks = isEligible && allowedLimit > 0
    ? filteredTasks.slice(0, allowedLimit)
    : isEligible
    ? filteredTasks
    : [];

  const totalPages = Math.max(1, Math.ceil(quotaTasks.length / PAGE_SIZE));
  const paginatedTasks = quotaTasks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero Banner Card with rich gradient */}
      <div
        className={`rounded-3xl border relative overflow-hidden flex flex-row items-stretch justify-between shadow-xl transition-all ${
          isDark
            ? "bg-gradient-to-br from-[#001848] via-[#022864] to-[#043b78] border-[#1e4d8e]/70 text-white shadow-[#001035]/50"
            : "bg-gradient-to-br from-[#002060] via-[#083578] to-[#104b98] border-[#10356c] text-white shadow-blue-950/20"
        }`}
      >
        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between z-10 min-w-0">
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-black leading-snug tracking-tight text-white pt-1">
              Complete Clean Energy Tasks, Earn Rewards
            </h2>
            <p className="text-xs leading-relaxed max-w-[230px] text-slate-200">
              Review daily solar & clean microgrid installations to earn instant payouts credited to your wallet.
            </p>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                const firstAvailable = quotaTasks.find((t) => !t.completedToday);
                if (firstAvailable) {
                  setSelectedTask(firstAvailable);
                } else if (quotaTasks[0]) {
                  setSelectedTask(quotaTasks[0]);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#40b020] to-[#50b020] hover:from-[#48c025] hover:to-[#58c828] text-slate-950 text-xs font-black shadow-md shadow-[#40b020]/30 transition active:scale-95 cursor-pointer"
            >
              <span>Accept Task</span>
            </button>
          </div>
        </div>

        {/* Right Hero Image with smooth blending gradient */}
        <div className="w-[140px] sm:w-[180px] relative shrink-0 overflow-hidden">
          <Image
            src="/images/task_hero_resort.jpg"
            alt="Review Tasks Hero"
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 140px, 180px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#022864]/70 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>

      {!activePlan && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark
              ? "glass-panel-lime border-[#40b020]/40 text-white"
              : "bg-emerald-50/80 border-emerald-200 text-slate-900 shadow-xs"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#40b020]/20 text-[#40b020] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className={`text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                Unlock Full Daily Tasks Quota
              </h4>
              <p className={`text-[11px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Subscribe to a VIP package to earn up to ₦34,000 every single day!
              </p>
            </div>
          </div>
          <Link
            href="/packages"
            className="py-2 px-3.5 rounded-xl bg-[#40b020] text-slate-950 font-bold text-xs flex items-center justify-center gap-1 shrink-0 hover:opacity-95 shadow-xs"
          >
            View Packages <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Available Tasks Header with Refresh Button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h3 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            Available Tasks
          </h3>
          {allowedLimit > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-[#40b020]/15 text-[#15803d] dark:text-[#40b020] text-[10px] font-bold">
              Limit: {allowedLimit}/day
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fetchTasks(true)}
          disabled={refreshing}
          className={`text-xs flex items-center gap-1.5 transition font-semibold cursor-pointer ${
            refreshing
              ? "opacity-60"
              : isDark
              ? "text-[#40b020] hover:text-[#50b020]"
              : "text-[#002060] hover:text-[#10356c]"
          }`}
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#40b020]" : ""}`} />
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Tasks List with Reference Design & Pagination */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#40b020] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : quotaTasks.length === 0 ? (
        <div
          className={`p-10 rounded-3xl text-center space-y-3 border ${
            isDark ? "glass-panel border-slate-800 text-white" : "bg-white border-[#e6ebf2] text-slate-900 shadow-xs"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#40b020]/10 text-[#40b020] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
            No Tasks Available
          </h3>
          <p className={`text-xs max-w-sm mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {!isEligible || allowedLimit === 0
              ? "Subscribe to a package to unlock your daily tasks quota."
              : "No tasks found in this category for today. Check other categories or return to dashboard."}
          </p>
          <div className="pt-2">
            <Link
              href={!isEligible || allowedLimit === 0 ? "/packages" : "/dashboard"}
              className="py-2.5 px-5 rounded-xl bg-[#40b020] text-slate-950 text-xs font-bold hover:opacity-95 transition shadow-xs"
            >
              {!isEligible || allowedLimit === 0 ? "View Packages" : "Return to Dashboard"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3.5">
            {paginatedTasks.map((task, idx) => {
              const isCompleted = Boolean(task.completedToday);
              const reward = Number(task.rewardAmount || taskData?.rewardPerTask || 225);
              const globalIndex = (currentPage - 1) * PAGE_SIZE + idx;
              
              // Assign thumbnail images sequentially
              const thumbs = [
                "/images/task_thumb_1.jpg",
                "/images/task_thumb_2.jpg",
                "/images/task_thumb_3.jpg",
              ];
              const thumbSrc = task.imageUrl || thumbs[globalIndex % thumbs.length] || "/images/task_thumb_1.jpg";

              // Formatted approximate property/task amount
              const mockAmounts = [888888, 125000, 340000, 520000, 180000];
              const displayAmount = mockAmounts[globalIndex % mockAmounts.length] ?? 888888;

              return (
                <div
                  key={task.id}
                  className={`p-3 sm:p-4 rounded-3xl border transition-all flex items-center gap-3.5 shadow-xs ${
                    isCompleted
                      ? isDark
                        ? "border-slate-800/60 opacity-60 bg-slate-900/40"
                        : "border-slate-200 opacity-60 bg-slate-100"
                      : isDark
                        ? "bg-[#131d33]/90 border-slate-800 hover:border-[#40b020]/40 text-white"
                        : "bg-white border-[#e6ebf2] hover:border-[#40b020]/50 text-slate-900 shadow-sm"
                  }`}
                >
                  {/* Left: Thumbnail Image */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden relative shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                    <Image
                      src={thumbSrc}
                      alt={task.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>

                  {/* Middle: Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className={`text-xs sm:text-sm font-bold truncate leading-snug ${isDark ? "text-white" : "text-slate-900"}`}>
                      {task.title}
                    </h4>

                    {/* 2-Column Stats (Amount / Reward) */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block leading-tight">Amount</span>
                        <span className={`font-semibold truncate block ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          NGN {displayAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block leading-tight">Reward</span>
                        <span className={`font-semibold truncate block ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          NGN {reward.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Highlighted Green Reward */}
                    <div className="pt-0.5">
                      <span className="text-xs sm:text-sm font-black text-[#15803d] dark:text-[#40b020] block leading-tight">
                        NGN {reward.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-semibold text-[#15803d]/80 dark:text-[#40b020]/80 block leading-tight">
                        Reward
                      </span>
                    </div>
                  </div>

                  {/* Right: Accept Task Pill Button */}
                  <div className="shrink-0 pl-1">
                    {isCompleted ? (
                      <span className="px-3 py-1.5 rounded-full bg-[#40b020]/20 text-[#15803d] dark:text-[#40b020] text-xs font-bold flex items-center gap-1 border border-[#40b020]/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedTask(task)}
                        className={`px-3.5 sm:px-4 py-2 rounded-full font-bold text-xs shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap ${
                          isDark
                            ? "bg-[#40b020] hover:bg-[#50b020] text-slate-950 shadow-[#40b020]/20"
                            : "bg-gradient-to-r from-[#002060] to-[#10356c] hover:opacity-95 text-white shadow-blue-900/20"
                        }`}
                      >
                        Accept Task
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 pt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
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

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                        currentPage === pageNum
                          ? "bg-[#40b020] text-slate-950 shadow-md shadow-[#40b020]/20"
                          : isDark
                          ? "bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
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
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, quotaTasks.length)} of {quotaTasks.length} Available Tasks (Plan Quota: {allowedLimit}/day)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Completion Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 animate-scale-up ${isDark
                ? "bg-[#0f172a] border-slate-700 text-white"
                : "bg-white border-slate-200 text-slate-900"
              }`}
          >
            {completedReward !== null ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#40b020]/20 text-[#40b020] flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-950"}`}>
                    Task Completed!
                  </h3>
                  <p className="text-sm font-bold text-[#40b020] mt-1">
                    +₦{Number(completedReward).toLocaleString()} Credited to Wallet
                  </p>
                  <p className={`text-xs mt-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Your reward has been instantly deposited to your available balance.
                  </p>
                </div>

                <div className="pt-3">
                  <button
                    onClick={closeModal}
                    className="w-full py-3.5 rounded-xl bg-[#40b020] text-slate-950 font-bold text-xs shadow-lg shadow-[#40b020]/25 hover:opacity-95"
                  >
                    Continue Earning
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#40b020]/20 text-[#40b020] flex items-center justify-center">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                      Complete Task
                    </h3>
                  </div>
                  <button
                    onClick={closeModal}
                    className={`text-xs font-semibold p-1 ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                  >
                    ✕
                  </button>
                </div>

                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl border space-y-2 ${isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}
                >
                  <div className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-950"}`}>
                    {selectedTask.title}
                  </div>
                  <div className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {selectedTask.description}
                  </div>
                  <div
                    className={`pt-2 flex items-center justify-between text-xs border-t ${isDark ? "border-slate-800" : "border-slate-200"
                      }`}
                  >
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Reward:</span>
                    <span className="font-bold text-[#40b020]">
                      ₦{Number(selectedTask.rewardAmount || taskData?.rewardPerTask || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Rating Input */}
                <div className="space-y-2">
                  <label className={`block text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Your Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 text-2xl transition hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${star <= rating
                              ? "text-amber-400 fill-amber-400"
                              : isDark
                                ? "text-slate-700"
                                : "text-slate-300"
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Input */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Review / Feedback (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Provide a quick feedback comment..."
                    className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:border-[#40b020] resize-none ${isDark
                        ? "bg-slate-900/90 border-slate-800 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCompleteTask}
                    disabled={submitting}
                    className="flex-1 py-3.5 rounded-xl bg-[#40b020] hover:bg-[#50b020] text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#40b020]/25 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit & Claim Reward"}
                  </button>
                  <button
                    onClick={closeModal}
                    className={`py-3 px-4 rounded-xl font-semibold text-xs transition ${isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
