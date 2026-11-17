// A1 — Admin dashboard: Is anything stuck? Is any money wrong? Does any partner need a decision?
import { prisma } from "@/lib/db";
import { currentSession, passPaymentGate } from "@/lib/actions";
import { redirect } from "next/navigation";
import { formatOmr } from "@/lib/money";
import { thawaniIsSandbox } from "@/lib/thawani";
export const dynamic = "force-dynamic";
export default async function AdminHome() {
  const session = await currentSession();
  if (!session || session.role !== "admin") redirect("/auth/signin");
  const [orders, partners, payouts, gates, settings] = await Promise.all([
    prisma.order.findMany(), prisma.partner.findMany(), prisma.payout.findMany(),
    prisma.paymentGate.findMany(), prisma.setting.findMany(),
  ]);
  const gross = orders.filter((o) => o.status !== "cancelled_refunded").reduce((s, o) => s + o.totalBaisa, 0);
  const commission = orders.filter((o) => o.status === "collected").reduce((s, o) => s + o.commissionBaisa, 0);
  const pendingPartners = partners.filter((p) => p.status === "under_review" || p.status === "more_info_needed");
  const pendingPayouts = payouts.filter((p) => p.status === "ready");
  const banner = settings.find((s) => s.key === "announcement_banner")?.value;
  return (<div>
    <h1>Admin — today in Muscat</h1>
    {banner && <p className="notice">{banner}</p>}
    {thawaniIsSandbox() && <p className="notice">Payments are in Thawani sandbox / test mode. No real money moves until all four payment gates below are passed.</p>}
    <div className="kpis">
      <div className="kpi"><b>{formatOmr(gross)}</b>Gross sales</div>
      <div className="kpi"><b>{formatOmr(commission)}</b>ReEat commission (collected)</div>
      <div className="kpi"><b>{orders.filter((o) => o.status === "collected").length}/{orders.filter((o) => o.status === "paid" || o.status === "collected").length}</b>Collected / paid</div>
      <div className="kpi"><b>{pendingPartners.length}</b>Partners needing a decision</div>
      <div className="kpi"><b>{pendingPayouts.length}</b>Payouts pending</div>
    </div>
    <nav className="tabs">
      <a href="/admin/partners">Partners</a><a href="/admin/listings">Listings</a><a href="/admin/orders">Orders</a>
      <a href="/admin/payouts">Payouts</a><a href="/admin/finance">Finance</a><a href="/admin/settings">Settings</a>
      <a href="/admin/audit">Audit log</a><a href="/admin/checklist">OMA checklist</a>
    </nav>
    <h2>Payment gates — all required before the first real sale</h2>
    {gates.map((g) => (
      <div className="card" key={g.id}>
        <p>{g.passed ? "✅" : "⬜"} <b>{g.label}</b> {g.passed ? `— passed ${g.passedAt?.toISOString().slice(0, 10)}` : ""}</p>
        {!g.passed && <form action={async (f: FormData) => { "use server"; await passPaymentGate(g.gate, String(f.get("note") || "")); }}>
          <input name="note" placeholder="Evidence / note" />
          <button type="submit">Mark gate passed</button>
        </form>}
      </div>
    ))}
  </div>);
}
