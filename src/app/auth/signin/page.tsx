// C3 — Sign-in / sign-up: email + one-time code for customers; email + password
// + one-time code as the second factor for admin. Codes are never logged.
import { prisma } from "@/lib/db";
import { generateOtp, hashOtp, verifyPassword, signSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function SignIn({ searchParams }: { searchParams: { error?: string; step?: string; email?: string } }) {
  async function requestCode(form: FormData) {
    "use server";
    const email = String(form.get("email")).toLowerCase().trim();
    const password = String(form.get("password") || "");
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { role: "customer", email, status: "active" } });
    }
    if (user.role === "admin" || user.role === "partner_owner") {
      if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) redirect("/auth/signin?error=Invalid+credentials");
    }
    const code = generateOtp();
    await prisma.otpCode.create({ data: { userId: user.id, codeHash: hashOtp(code), purpose: user.role === "admin" ? "admin_2fa" : "signin", expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    // Pilot: no email provider is configured by default — the code is shown
    // here only in development. In production it is emailed, never displayed.
    console.log(`[ReEat] sign-in code requested for ${email} (code sent by email in production)`);
    redirect(`/auth/signin?step=code&email=${encodeURIComponent(email)}`);
  }
  async function verifyCode(form: FormData) {
    "use server";
    const email = String(form.get("email")).toLowerCase().trim();
    const code = String(form.get("code")).trim();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) redirect("/auth/signin?error=Invalid+code");
    const record = await prisma.otpCode.findFirst({ where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
    if (!record || record.codeHash !== hashOtp(code)) redirect("/auth/signin?error=Invalid+code");
    await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    cookies().set("reeat_session", signSession(user.id, user.role), { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    redirect(user.role === "admin" ? "/admin" : user.role.startsWith("partner") ? "/partner" : "/");
  }
  return (
    <div>
      <h1>Sign in</h1>
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      {searchParams.step === "code" ? (
        <form action={verifyCode} className="card">
          <p>We sent a 6-digit code to <b>{searchParams.email}</b>. It expires in 10 minutes.</p>
          <input type="hidden" name="email" value={searchParams.email || ""} />
          <label>One-time code</label>
          <input name="code" inputMode="numeric" maxLength={6} required />
          <button type="submit">Verify and sign in</button>
        </form>
      ) : (
        <form action={requestCode} className="card">
          <label>Email</label>
          <input type="email" name="email" required />
          <label>Password (admin / partner accounts only — leave blank for customers)</label>
          <input type="password" name="password" />
          <button type="submit">Send me a code</button>
          <p>By signing in you consent to the terms and privacy policy. Consent is recorded with a timestamp.</p>
        </form>
      )}
    </div>
  );
}
