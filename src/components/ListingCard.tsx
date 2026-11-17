import Link from "next/link";
import { formatOmr } from "@/lib/money";
import { discountPercent } from "@/lib/pricing";
import { formatMuscat } from "@/lib/time";

export default function ListingCard({ listing }: { listing: any }) {
  const off = Math.round(discountPercent(listing.originalPriceBaisa, listing.reeatPriceBaisa));
  return (
    <div className="card">
      <span className="badge">{listing.partner.displayName} · {listing.partner.area}</span>
      <h3>{listing.title}</h3>
      <p>{listing.description}</p>
      <p><span className="was">{formatOmr(listing.originalPriceBaisa)}</span>{" "}
        <span className="price">{formatOmr(listing.reeatPriceBaisa)}</span>{" "}
        <span className="badge">{off}% off</span></p>
      <p>{listing.quantityRemaining} left · Pickup {formatMuscat(listing.pickupStart)} – {formatMuscat(listing.pickupEnd)} (Muscat)</p>
      <Link className="btn" href={`/listings/${listing.id}`}>View &amp; buy</Link>
    </div>
  );
}
