export type TaskIneligibleReason =
  | "NO_ACTIVE_INVESTMENT"
  | "NO_TASKS_FOR_PACKAGE";

export type TaskAllowance = {
  eligible: boolean;
  dailyLimit: number;
  rewardPerTask: number;
  reason?: TaskIneligibleReason;
};

export const TASK_COMMENT_MIN = 10;
export const TASK_COMMENT_MAX = 500;

/** Daily review cap comes from the subscribed plan. If several are active, the highest limit wins (then highest reward). */
export function resolveTaskAllowance(
  activePackages: { dailyTaskLimit: number; taskReward: number }[],
): TaskAllowance {
  if (activePackages.length === 0) {
    return {
      eligible: false,
      dailyLimit: 0,
      rewardPerTask: 0,
      reason: "NO_ACTIVE_INVESTMENT",
    };
  }
  let best = activePackages[0]!;
  for (const pkg of activePackages.slice(1)) {
    if (
      pkg.dailyTaskLimit > best.dailyTaskLimit ||
      (pkg.dailyTaskLimit === best.dailyTaskLimit &&
        pkg.taskReward > best.taskReward)
    ) {
      best = pkg;
    }
  }
  if (best.dailyTaskLimit <= 0) {
    return {
      eligible: false,
      dailyLimit: 0,
      rewardPerTask: 0,
      reason: "NO_TASKS_FOR_PACKAGE",
    };
  }
  return {
    eligible: true,
    dailyLimit: best.dailyTaskLimit,
    rewardPerTask: best.taskReward,
  };
}

export function remainingTasks(dailyLimit: number, completedToday: number) {
  return Math.max(0, dailyLimit - completedToday);
}

export function utcTaskDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function validateTaskReview(input: { stars: unknown; comment: unknown }):
  | { ok: true; stars: number; comment: string }
  | { ok: false; message: string } {
  const stars = input.stars;
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { ok: false, message: "Stars must be a whole number from 1 to 5." };
  }
  const comment = typeof input.comment === "string" ? input.comment.trim() : "";
  if (comment.length < TASK_COMMENT_MIN) {
    return {
      ok: false,
      message: `Comment must be at least ${TASK_COMMENT_MIN} characters.`,
    };
  }
  if (comment.length > TASK_COMMENT_MAX) {
    return {
      ok: false,
      message: `Comment must be at most ${TASK_COMMENT_MAX} characters.`,
    };
  }
  return { ok: true, stars, comment };
}
