// P6 — Sales and payouts.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
import { formatOmr } from "@/lib/money";
export const dynamic = "force-dynamic";
export default async function PartnerSales() {
  const session = await currentSession();
  if (!session || !session.role.startsWith("partner")) redirect("/auth/signin");
  const partner = await prisma.partner.findFirst({ where: { ownerUserId: session.user.id } });
  if (!partner) return <p>No partner account linked.</p>;
  const payouts = await prisma.payout.findMany({ where: { partnerId: partner.id }, orderBy: { createdAt: "desc" } });
  const orders = await prisma.order.findMany({ where: { partnerId: partner.id, status: "collected" } });
  const share = orders.reduce((s, o) => s + o.partnerShareBaisa, 0);
  return (<div><h1>Sales &amp; payouts</h1>
    <div className="kpis"><div className="kpi"><b>{formatOmr(share)}</b>Your share from collected orders</div></div>
    {payouts.map((p) => <div className="card" key={p.id}><p>Period {p.periodStart.toISOString().slice(0, 10)} – {p.periodEnd.toISOString().slice(0, 10)}</p><p>Gross {formatOmr(p.grossBaisa)} · Your share {formatOmr(p.partnerShareBaisa)} · Commission {formatOmr(p.commissionBaisa)} · Status: <b>{p.status}</b>{p.bankReference ? ` · Ref: ${p.bankReference}` : ""}</p></div>)}
    {payouts.length === 0 && <div className="card"><p>No payouts yet. Payouts are weekly, for collected orders only, and are paid by bank transfer — the reference is recorded here.</p></div>}
  </div>);
}
