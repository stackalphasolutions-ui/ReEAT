// C2 — Listing detail + C4 checkout entry point.
import { prisma } from "@/lib/db";
import { formatOmr } from "@/lib/money";
import { formatMuscat } from "@/lib/time";
import { checkout, currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ListingDetail({ params }: { params: { id: string } }) {
  const listing = await prisma.listing.findUnique({ where: { id: params.id }, include: { partner: true } });
  if (!listing) return <p>Listing not found.</p>;
  const session = await currentSession();
  async function buy(form: FormData) {
    "use server";
    const qty = Number(form.get("quantity") || 1);
    const result = await checkout(params.id, qty);
    redirect(result.checkoutUrl);
  }
  return (
    <div>
      <h1>{listing.title}</h1>
      <p><span className="badge">{listing.partner.displayName} · {listing.partner.area}</span></p>
      <p>{listing.description}</p>
      {listing.allergenNote && <p><b>Allergen note:</b> {listing.allergenNote}</p>}
      <p><span className="was">{formatOmr(listing.originalPriceBaisa)}</span> <span className="price">{formatOmr(listing.reeatPriceBaisa)}</span></p>
      <p>{listing.quantityRemaining} left · Pickup {formatMuscat(listing.pickupStart)} – {formatMuscat(listing.pickupEnd)} (Muscat)</p>
      <p>{listing.partner.address} · {listing.partner.pickupInstructions || "Collect at the counter and show your pickup code."}</p>
      <p className="notice">Same-day pickup only — show your code at the counter.</p>
      {session ? (
        <form action={buy}>
          <label>Quantity (max {listing.quantityRemaining})</label>
          <input type="number" name="quantity" min={1} max={listing.quantityRemaining} defaultValue={1} />
          <button type="submit">Buy — pay with Thawani / Apple Pay / card</button>
        </form>
      ) : (
        <p><a className="btn" href="/auth/signin">Sign in to buy</a></p>
      )}
    </div>
  );
}
