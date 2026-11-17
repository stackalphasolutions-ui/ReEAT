// A8 — Finance / reconciliation: gateway settlements vs orders vs payouts.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
import { formatOmr } from "@/lib/money";
export const dynamic = "force-dynamic";
export default async function AdminFinance() {
  const session = await currentSession();
  if (!session || session.role !== "admin") redirect("/auth/signin");
  const [orders, payments, payouts] = await Promise.all([prisma.order.findMany(), prisma.payment.findMany(), prisma.payout.findMany()]);
  const paidTotal = payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amountBaisa, 0);
  const payoutTotal = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.partnerShareBaisa, 0);
  const exceptions = orders.filter((o) => o.status === "paid" && !payments.some((p) => p.orderId === o.id && p.status === "succeeded"));
  return (<div><h1>Finance &amp; reconciliation</h1>
    <div className="kpis">
      <div className="kpi"><b>{formatOmr(paidTotal)}</b>Gateway payments succeeded</div>
      <div className="kpi"><b>{formatOmr(payoutTotal)}</b>Partner share paid out</div>
      <div className="kpi"><b>{exceptions.length}</b>Reconciliation exceptions</div>
    </div>
    {exceptions.length > 0 ? exceptions.map((o) => <div className="card" key={o.id}><p>Exception: order {o.id} is paid with no matching succeeded gateway payment. Resolve before any payout for this partner.</p></div>) : <p>No unresolved exceptions.</p>}
    <p>Any mismatch is flagged here — it is never silently adjusted. No manual adjustment without an audit-log entry stating the reason, the orders affected, and the amount.</p>
  </div>);
}
