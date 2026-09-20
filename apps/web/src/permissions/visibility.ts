/** True if the admin has any of the required codes (empty required = always visible). */
export function hasAnyPermission(
  held: string[],
  required: readonly string[],
): boolean {
  if (required.length === 0) return true;
  return required.some((code) => held.includes(code));
}
