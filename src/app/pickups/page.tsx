// C6 — My Pickups: codes shown large for counter use.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { formatOmr } from "@/lib/money";
import { formatMuscat } from "@/lib/time";
import { submitReview } from "@/lib/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Pickups() {
  const session = await currentSession();
  if (!session || session.role !== "customer") redirect("/auth/signin");
  const orders = await prisma.order.findMany({ where: { customerId: session.user.id }, include: { partner: true, review: true }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1>My Pickups</h1>
      {orders.length === 0 && <div className="card"><p>No pickups yet. Browse today&apos;s rescue board to find surplus near you.</p></div>}
      {orders.map((o) => (
        <div className="card" key={o.id}>
          <h3>{o.itemName} — {o.partner.displayName}</h3>
          <p>{o.quantity} × {formatOmr(o.unitPriceBaisa)} = {formatOmr(o.totalBaisa)} · Status: <b>{o.status}</b></p>
          {o.status === "paid" && <div className="code">{o.pickupCode}</div>}
          {o.status === "collected" && !o.review && (
            <form action={async (f: FormData) => { "use server"; await submitReview(o.id, Number(f.get("rating")), String(f.get("comment") || "")); }}>
              <label>Rate this pickup (1–5)</label>
              <input type="number" name="rating" min={1} max={5} defaultValue={5} />
              <input name="comment" placeholder="Short comment (optional)" />
              <button type="submit">Leave a review</button>
            </form>
          )}
          {o.status === "collected" && o.review && <p>Your review: {o.review.rating}/5</p>}
        </div>
      ))}
    </div>
  );
}
