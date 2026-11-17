// P1 — Partner dashboard: today at a glance.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
import { formatOmr } from "@/lib/money";
export const dynamic = "force-dynamic";
export default async function PartnerHome() {
  const session = await currentSession();
  if (!session || !session.role.startsWith("partner")) redirect("/auth/signin");
  const partner = await prisma.partner.findFirst({ where: { ownerUserId: session.user.id } });
  if (!partner) return <p>No partner account linked to this sign-in. Contact the ReEat Team at Stack Alpha.</p>;
  const today = await prisma.listing.findMany({ where: { partnerId: partner.id, status: "live" } });
  const orders = await prisma.order.findMany({ where: { partnerId: partner.id, status: { in: ["paid", "collected"] } } });
  const gross = orders.reduce((s, o) => s + o.totalBaisa, 0);
  const share = orders.reduce((s, o) => s + o.partnerShareBaisa, 0);
  return (<div>
    <h1>{partner.displayName} — today</h1>
    <p>Status: <span className="badge">{partner.status}</span> · Area: {partner.area}</p>
    {partner.status !== "live" && partner.status !== "verified" && <p className="notice">Your partner application is {partner.status}. You cannot publish listings until licence verification is complete — upload your documents under Verification.</p>}
    <div className="kpis">
      <div className="kpi"><b>{today.length}</b>Live listings</div>
      <div className="kpi"><b>{orders.filter((o) => o.status === "paid").length}</b>Pickups awaiting collection</div>
      <div className="kpi"><b>{formatOmr(gross)}</b>Today&apos;s gross sales</div>
      <div className="kpi"><b>{formatOmr(share)}</b>Your share (80%)</div>
    </div>
    <nav className="tabs">
      <a href="/partner/listings">My listings</a><a href="/partner/listings/new">New listing</a>
      <a href="/partner/orders">Orders</a><a href="/partner/verify">Verify a code</a>
      <a href="/partner/sales">Sales &amp; payouts</a><a href="/partner/documents">Verification</a>
      <a href="/partner/profile">Profile</a>
    </nav>
  </div>);
}
