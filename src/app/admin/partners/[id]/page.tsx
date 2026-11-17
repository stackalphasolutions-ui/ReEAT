// A2 — Partner application detail: licence documents, approve / more info / reject.
import { prisma } from "@/lib/db";
import { currentSession, approvePartner, setPartnerStatus, reviewDocument } from "@/lib/actions";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function PartnerDetail({ params }: { params: { id: string } }) {
  const session = await currentSession();
  if (!session || session.role !== "admin") redirect("/auth/signin");
  const partner = await prisma.partner.findUnique({ where: { id: params.id }, include: { documents: true } });
  if (!partner) return <p>Partner not found.</p>;
  const licenceOk = partner.documents.some((d) => d.documentType === "municipality_licence" && d.reviewStatus === "approved");
  const foodOk = partner.documents.some((d) => d.documentType === "food_safety_approval" && d.reviewStatus === "approved");
  return (<div>
    <h1>{partner.displayName}</h1>
    <p>Status: <span className="badge">{partner.status}</span> · {partner.area} · {partner.address}</p>
    <p>Contact: {partner.contactEmail} · {partner.contactPhone}</p>
    <p>Bank: {partner.bankName || "—"} · {partner.accountName || "—"} · IBAN on file: {partner.iban ? "Yes" : "No"}</p>
    <h2>Licence gate — all four are required before approval</h2>
    <p>Muscat Municipality licence: {licenceOk ? "✅ approved" : "⬜ not approved"}</p>
    <p>Food-safety approval: {foodOk ? "✅ approved" : "⬜ not approved"}</p>
    <p>Name/address match licence: {partner.address ? "✅ on file" : "⬜ missing"}</p>
    <p>Bank details: {partner.iban ? "✅ on file" : "⬜ missing"}</p>
    <h2>Documents</h2>
    {partner.documents.map((d) => (
      <div className="card" key={d.id}>
        <p>{d.documentType} — {d.reviewStatus}{d.expiryDate ? ` · expires ${d.expiryDate.toISOString().slice(0, 10)}` : ""}{d.reviewNote ? ` · ${d.reviewNote}` : ""}</p>
        <form action={async (f: FormData) => { "use server"; await reviewDocument(d.id, String(f.get("decision")) === "approve", String(f.get("note") || "")); }}>
          <input name="note" placeholder="Review note" />
          <button type="submit" name="decision" value="approve">Approve document</button>
          <button type="submit" name="decision" value="reject" className="secondary">Reject</button>
        </form>
      </div>
    ))}
    {partner.documents.length === 0 && <p className="notice">No documents uploaded yet — approval is blocked until they are supplied and approved.</p>}
    <div className="card">
      <form action={async () => { "use server"; await approvePartner(partner.id); }}><button type="submit">Approve partner</button></form>
      <form action={async () => { "use server"; await setPartnerStatus(partner.id, "more_info_needed", "More information needed"); }}><button type="submit" className="secondary">Request more information</button></form>
      <form action={async () => { "use server"; await setPartnerStatus(partner.id, "rejected", "Rejected by admin"); }}><button type="submit" className="secondary">Reject</button></form>
      <form action={async () => { "use server"; await setPartnerStatus(partner.id, "suspended", "Suspended by admin"); }}><button type="submit" className="secondary">Suspend</button></form>
      <form action={async () => { "use server"; await setPartnerStatus(partner.id, "live", "Reinstated by admin"); }}><button type="submit" className="secondary">Reinstate / go live</button></form>
      <p>If approval fails, the licence gate is blocking it — check the four items above.</p>
    </div>
  </div>);
}
