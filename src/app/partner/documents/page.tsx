// P8 — Verification and documents. Private — licence documents are never on a public URL.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function PartnerDocuments() {
  const session = await currentSession();
  if (!session || !session.role.startsWith("partner")) redirect("/auth/signin");
  const partner = await prisma.partner.findFirst({ where: { ownerUserId: session.user.id }, include: { documents: true } });
  if (!partner) return <p>No partner account linked.</p>;
  return (<div><h1>Verification &amp; documents</h1>
    <p>Status: <span className="badge">{partner.status}</span></p>
    <p>To be verified you need: (1) a current Muscat Municipality licence, (2) food-safety approval, (3) name/address matching the licence, (4) bank details in the business or owner&apos;s name. If any item is missing, the admin asks for more information — approval is never given on a promise.</p>
    {partner.documents.map((d) => <div className="card" key={d.id}><p>{d.documentType} — {d.reviewStatus}{d.expiryDate ? ` · expires ${d.expiryDate.toISOString().slice(0, 10)}` : ""}{d.reviewNote ? ` · ${d.reviewNote}` : ""}</p></div>)}
    {partner.documents.length === 0 && <div className="card"><p>No documents uploaded yet. Send your licence and food-safety approval to the ReEat Team at Stack Alpha, and they will be recorded here by the admin.</p></div>}
  </div>);
}
