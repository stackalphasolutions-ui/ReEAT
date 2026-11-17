// C1 — Home / Rescue board: today's live listings in Muscat.
import { prisma } from "@/lib/db";
import ListingCard from "@/components/ListingCard";
import { thawaniIsSandbox } from "@/lib/thawani";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { area?: string; category?: string } }) {
  const listings = await prisma.listing.findMany({
    where: {
      status: "live",
      quantityRemaining: { gt: 0 },
      partner: { status: { in: ["verified", "live"] } },
      ...(searchParams.category ? { category: searchParams.category as never } : {}),
      ...(searchParams.area ? { partner: { area: { contains: searchParams.area, mode: "insensitive" } } } : {}),
    },
    include: { partner: true },
    orderBy: { pickupEnd: "asc" },
  });
  return (
    <div>
      <h1>Today&apos;s surplus in Muscat</h1>
      <p>Same-day food at about 50% off, pickup only. Show your code at the counter.</p>
      {thawaniIsSandbox() && <p className="notice">Payments are in Thawani sandbox / test mode — no real charge is made until the payment gates in Admin are passed.</p>}
      <form method="get" style={{ display: "flex", gap: 8 }}>
        <input name="area" placeholder="Area, e.g. Al Khuwair" defaultValue={searchParams.area || ""} />
        <select name="category" defaultValue={searchParams.category || ""}>
          <option value="">All categories</option>
          <option value="bakery">Bakery</option><option value="cafe">Cafe</option>
          <option value="restaurant">Restaurant</option><option value="sweets">Sweets</option>
        </select>
        <button type="submit">Filter</button>
      </form>
      {listings.length === 0 ? (
        <div className="card"><p>No listings live right now. Check back later today — partners list surplus as the day goes on.</p></div>
      ) : (
        <div className="grid">{listings.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
      )}
    </div>
  );
}
