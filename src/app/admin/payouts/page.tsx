// A6 — Weekly payout queue. A payout cannot be released twice for the same orders.
import { prisma } from "@/lib/db";
import { currentSession, buildPayout, setPayoutStatus } from "@/lib/actions";
import { redirect } from "next/navigation";
import { formatOmr } from "@/lib/money";
export const dynamic = "force-dynamic";
export default async function AdminPayouts() {
  const session = await currentSession();
  if (!session || session.role !== "admin") redirect("/auth/signin");
  const [payouts, partners] = await Promise.all([prisma.payout.findMany({ include: { partner: true, items: true }, orderBy: { createdAt: "desc" } }), prisma.partner.findMany()]);
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return (<div><h1>Payouts</h1>
    <p>Weekly, for collected orders only. Pay by bank transfer outside the app, then record the reference here.</p>
    <div className="card"><h3>Build this week&apos;s payout</h3>
      {partners.map((p) => (
        <form key={p.id} action={async () => { "use server"; await buildPayout(p.id, weekStart, now); }}>
          <button type="submit">Build payout — {p.displayName}</button>
        </form>
      ))}
    </div>
    {payouts.map((p) => (
      <div className="card" key={p.id}>
        <h3>{p.partner.displayName} — {p.periodStart.toISOString().slice(0, 10)} to {p.periodEnd.toISOString().slice(0, 10)}</h3>
        <p>Gross {formatOmr(p.grossBaisa)} · Partner share {formatOmr(p.partnerShareBaisa)} · Commission {formatOmr(p.commissionBaisa)} · {p.items.length} orders · Status: <b>{p.status}</b>{p.bankReference ? ` · Ref: ${p.bankReference}` : ""}</p>
        {p.status === "ready" && <form action={async () => { "use server"; await setPayoutStatus(p.id, "approved"); }}><button type="submit">Approve payout</button></form>}
        {p.status === "approved" && <form action={async (f: FormData) => { "use server"; await setPayoutStatus(p.id, "paid", String(f.get("bankReference") || "")); }}>
          <input name="bankReference" placeholder="Bank transfer reference" required />
          <button type="submit">Mark paid</button>
        </form>}
      </div>
    ))}
    {payouts.length === 0 && <div className="card"><p>No payouts built yet.</p></div>}
  </div>);
}
