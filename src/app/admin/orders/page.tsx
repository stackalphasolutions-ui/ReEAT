// A5 — Orders: searchable timeline, cancel/refund with a mandatory reason.
import { prisma } from "@/lib/db";
import { currentSession, refundOrder } from "@/lib/actions";
import { redirect } from "next/navigation";
import { formatOmr } from "@/lib/money";
export const dynamic = "force-dynamic";
export default async function AdminOrders() {
  const session = await currentSession();
  if (!session || session.role !== "admin") redirect("/auth/signin");
  const orders = await prisma.order.findMany({ include: { partner: true, customer: true }, orderBy: { createdAt: "desc" } });
  return (<div><h1>Orders</h1>
    {orders.map((o) => (
      <div className="card" key={o.id}>
        <h3>{o.itemName} × {o.quantity} — {o.partner.displayName}</h3>
        <p>Code: {o.pickupCode} · {formatOmr(o.totalBaisa)} · Status: <b>{o.status}</b>{o.refundReason ? ` · Refund reason: ${o.refundReason}` : ""}</p>
        {o.status === "paid" && <form action={async (f: FormData) => { "use server"; await refundOrder(o.id, String(f.get("reason") || "Admin refund")); }}>
          <input name="reason" placeholder="Refund reason (required)" required />
          <button type="submit" className="secondary">Cancel &amp; refund</button>
        </form>}
      </div>
    ))}
    {orders.length === 0 && <div className="card"><p>No orders yet.</p></div>}
  </div>);
}
