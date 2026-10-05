/** Session is usable when not revoked and not expired. */
export function isSessionLive(input: {
  expiresAt: Date;
  revokedAt: Date | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (input.revokedAt != null) return false;
  return input.expiresAt.getTime() > now.getTime();
}

/** Ownership: resource owner must match actor. */
export function assertSameOwner(
  ownerId: string,
  actorId: string,
): "OK" | "FORBIDDEN" {
  return ownerId === actorId ? "OK" : "FORBIDDEN";
}

/** Idempotent replay when a prior row exists for the key. */
export function idempotencyDecision(existing: unknown | null | undefined): {
  replay: boolean;
} {
  return { replay: existing != null };
}

/** Positive integer lot counts only. */
export function validateSlotCount(slotCount: number): "OK" | "INVALID_SLOT_COUNT" {
  if (!Number.isInteger(slotCount) || slotCount < 1) return "INVALID_SLOT_COUNT";
  return "OK";
}

/** Deposit amount in minor units. */
export function validateDepositAmount(
  amount: number,
  minAmount: number,
): "OK" | "INVALID_AMOUNT" {
  if (!Number.isInteger(amount) || amount < minAmount) return "INVALID_AMOUNT";
  return "OK";
}

/** Admin permission gate over an in-memory code list. */
export function requirePermissionCodes(
  held: string[],
  required: string,
): "OK" | "FORBIDDEN" {
  return held.includes(required) ? "OK" : "FORBIDDEN";
}
