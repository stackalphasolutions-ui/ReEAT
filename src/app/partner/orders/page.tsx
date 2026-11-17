// P4 — Orders / pickups queue.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
import { formatOmr } from "@/lib/money";
export const dynamic = "force-dynamic";
export default async function PartnerOrders() {
  const session = await currentSession();
  if (!session || !session.role.startsWith("partner")) redirect("/auth/signin");
  const partner = await prisma.partner.findFirst({ where: { ownerUserId: session.user.id } });
  if (!partner) return <p>No partner account linked.</p>;
  const orders = await prisma.order.findMany({ where: { partnerId: partner.id }, include: { customer: true }, orderBy: { createdAt: "desc" } });
  return (<div><h1>Today&apos;s orders</h1>
    {orders.map((o) => <div className="card" key={o.id}><h3>{o.itemName} × {o.quantity}</h3><p>Customer: {o.customer.fullName || "Customer"} · {formatOmr(o.totalBaisa)} · Status: <b>{o.status}</b></p><a className="btn secondary" href="/partner/verify">Verify a code</a></div>)}
    {orders.length === 0 && <div className="card"><p>No paid orders yet today.</p></div>}
  </div>);
}
