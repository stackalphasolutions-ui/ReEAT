// A2/A3 — Partner applications and partners.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function AdminPartners() {
  const session = await currentSession();
  if (!session || session.role !== "admin") redirect("/auth/signin");
  const partners = await prisma.partner.findMany({ orderBy: { createdAt: "desc" } });
  return (<div><h1>Partners</h1>
    {partners.map((p) => <div className="card" key={p.id}>
      <h3>{p.displayName} — {p.area}</h3>
      <p>Status: <span className="badge">{p.status}</span> · {p.contactEmail} · {p.contactPhone}</p>
      <a className="btn" href={`/admin/partners/${p.id}`}>Review application</a>
    </div>)}
    {partners.length === 0 && <div className="card"><p>No partner applications yet.</p></div>}
  </div>);
}
