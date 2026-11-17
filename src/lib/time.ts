// Times — spec §4: stored in UTC, displayed in Asia/Muscat.
export const MUSCAT_TZ = "Asia/Muscat";

export function todayInMuscat(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MUSCAT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function formatMuscat(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MUSCAT_TZ, day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}
export function formatMuscatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", { timeZone: MUSCAT_TZ, day: "2-digit", month: "short", year: "numeric" }).format(date);
}
/** Pickup code grace period: 30 minutes after the pickup window ends (spec §5). */
export const PICKUP_GRACE_MINUTES = 30;
export function codeExpiresAt(pickupEnd: Date): Date {
  return new Date(pickupEnd.getTime() + PICKUP_GRACE_MINUTES * 60_000);
}
