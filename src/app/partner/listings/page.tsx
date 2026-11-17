// P3 — My listings.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
import { formatOmr } from "@/lib/money";
export const dynamic = "force-dynamic";
export default async function PartnerListings() {
  const session = await currentSession();
  if (!session || !session.role.startsWith("partner")) redirect("/auth/signin");
  const partner = await prisma.partner.findFirst({ where: { ownerUserId: session.user.id } });
  if (!partner) return <p>No partner account linked.</p>;
  const listings = await prisma.listing.findMany({ where: { partnerId: partner.id }, orderBy: { createdAt: "desc" } });
  return (<div><h1>My listings</h1><a className="btn" href="/partner/listings/new">New listing — 30 seconds</a>
    {listings.map((l) => <div className="card" key={l.id}><h3>{l.title}</h3><p>{formatOmr(l.reeatPriceBaisa)} · {l.quantityRemaining}/{l.quantityTotal} left · {l.status}</p></div>)}
    {listings.length === 0 && <div className="card"><p>No listings yet.</p></div>}
  </div>);
}
