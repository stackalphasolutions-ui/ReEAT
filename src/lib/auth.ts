// Auth — spec §3. Customers: email/mobile + one-time code. Partner owners:
// email invitation from Admin only, no public sign-up. Admin: email + password
// + one-time code as the second factor. Sessions are signed cookies.
// Passwords/OTP codes are stored hashed, never in plain text.
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}
export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export function signSession(userId: string, role: string): string {
  const secret = process.env.SESSION_SECRET || "reeat-dev-only-change-me";
  const payload = Buffer.from(JSON.stringify({ userId, role, exp: Date.now() + SESSION_MAX_AGE * 1000 })).toString("base64url");
  const sig = createHash("sha256").update(`${payload}.${secret}`).digest("hex");
  return `${payload}.${sig}`;
}
export function readSession(cookieValue: string | undefined): { userId: string; role: string } | null {
  if (!cookieValue) return null;
  const [payload, sig] = cookieValue.split(".");
  if (!payload || !sig) return null;
  const secret = process.env.SESSION_SECRET || "reeat-dev-only-change-me";
  const expected = createHash("sha256").update(`${payload}.${secret}`).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch { return null; }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return { userId: data.userId, role: data.role };
  } catch { return null; }
}
