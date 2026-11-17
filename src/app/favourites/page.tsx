// C7 — Favourites.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Favourites() {
  const session = await currentSession();
  if (!session || session.role !== "customer") redirect("/auth/signin");
  const favs = await prisma.favourite.findMany({ where: { customerId: session.user.id }, include: { partner: true } });
  return (<div><h1>Favourites</h1>
    {favs.length === 0 ? <div className="card"><p>No favourite partners yet.</p></div> :
      favs.map((f) => <div className="card" key={f.partnerId}><h3>{f.partner.displayName}</h3><p>{f.partner.area} · {f.partner.address}</p></div>)}
  </div>);
}
