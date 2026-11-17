// Pickup codes — spec §5: single-use, at least 6 characters, unpredictable,
// expire at the end of the pickup window plus a 30-minute grace period.
import { randomBytes, createHash } from "node:crypto";

export function generatePickupCode(): string {
  // 6 characters from an unambiguous alphabet, e.g. "K7Q2M9".
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
export function hashPickupCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
