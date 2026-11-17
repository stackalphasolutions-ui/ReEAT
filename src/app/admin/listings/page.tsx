// A4 — Listings moderation.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
import { formatOmr } from "@/lib/money";
export const dynamic = "force-dynamic";
export default async function AdminListings() {
  const session = await currentSession();
  if (!session || session.role !== "admin") redirect("/auth/signin");
  const listings = await prisma.listing.findMany({ include: { partner: true }, orderBy: { createdAt: "desc" } });
  return (<div><h1>Listings moderation</h1>
    {listings.map((l) => <div className="card" key={l.id}><h3>{l.title} — {l.partner.displayName}</h3><p>{formatOmr(l.reeatPriceBaisa)} (was {formatOmr(l.originalPriceBaisa)}) · {l.quantityRemaining}/{l.quantityTotal} left · {l.status}</p></div>)}
    {listings.length === 0 && <div className="card"><p>No listings yet.</p></div>}
  </div>);
}
