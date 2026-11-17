// P7 — Partner profile. Name/address/bank changes need admin approval before going live.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function PartnerProfile() {
  const session = await currentSession();
  if (!session || !session.role.startsWith("partner")) redirect("/auth/signin");
  const partner = await prisma.partner.findFirst({ where: { ownerUserId: session.user.id } });
  if (!partner) return <p>No partner account linked.</p>;
  return (<div><h1>Partner profile</h1><div className="card">
    <p><b>{partner.displayName}</b> · {partner.area}</p>
    <p>{partner.address}</p>
    <p>Opening hours: {partner.openingHours || "—"}</p>
    <p>Pickup instructions: {partner.pickupInstructions || "Collect at the counter and show your pickup code."}</p>
    <p>Contact: {partner.contactEmail} · {partner.contactPhone}</p>
    <p>Bank: {partner.bankName || "—"} · {partner.accountName || "—"}</p>
    <p className="notice">Changes to name, address or bank details need admin approval before they go live. Bank-detail changes never take effect on a partner&apos;s say-so alone.</p>
  </div></div>);
}
