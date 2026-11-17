// P2 — Create listing (30-second flow). Pricing guardrails enforced server-side.
import { prisma } from "@/lib/db";
import { currentSession, createListing } from "@/lib/actions";
import { redirect } from "next/navigation";
export default async function NewListing() {
  const session = await currentSession();
  if (!session || !session.role.startsWith("partner")) redirect("/auth/signin");
  const partner = await prisma.partner.findFirst({ where: { ownerUserId: session.user.id } });
  if (!partner) return <p>No partner account linked.</p>;
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
  const end = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16);
  return (<div><h1>New listing</h1><p>Same-day only. The ReEat price must be 30–70% below the original price.</p>
    <form action={createListing} className="card">
      <input type="hidden" name="partnerId" value={partner.id} />
      <label>Item name</label><input name="title" required />
      <label>Description</label><input name="description" />
      <label>Category</label><select name="category"><option value="bakery">Bakery</option><option value="cafe">Cafe</option><option value="restaurant">Restaurant</option><option value="sweets">Sweets</option><option value="other">Other</option></select>
      <label>Original price (baisa — 1 OMR = 1,000 baisa, e.g. 2000 = OMR 2.000)</label><input type="number" name="originalPriceBaisa" required />
      <label>ReEat price (baisa)</label><input type="number" name="reeatPriceBaisa" required />
      <label>Quantity available</label><input type="number" name="quantity" min={1} required />
      <label>Pickup start</label><input type="datetime-local" name="pickupStart" defaultValue={start} required />
      <label>Pickup end</label><input type="datetime-local" name="pickupEnd" defaultValue={end} required />
      <label>Allergen note</label><input name="allergenNote" placeholder="e.g. Contains gluten, nuts" />
      <button type="submit">Publish listing</button>
    </form></div>);
}
