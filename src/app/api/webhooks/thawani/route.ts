// Thawani webhook — spec §10: an order becomes Paid ONLY on a verified gateway
// webhook, never because a browser reached a success page.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyThawaniWebhook } from "@/lib/thawani";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-thawani-signature");
  const ok = await verifyThawaniWebhook(rawBody, signature);
  if (!ok) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  const event = JSON.parse(rawBody) as { type?: string; orderId?: string; gatewayReference?: string; status?: string };
  if (event.type === "payment.succeeded" && event.orderId) {
    const order = await prisma.order.findUnique({ where: { id: event.orderId } });
    if (order && order.status === "payment_pending") {
      await prisma.$transaction([
        prisma.order.update({ where: { id: order.id }, data: { status: "paid", paidAt: new Date() } }),
        prisma.listing.update({ where: { id: order.listingId }, data: { quantityRemaining: { decrement: order.quantity } } }),
        prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: "succeeded", gatewayReference: event.gatewayReference } }),
      ]);
    }
  }
  if (event.type === "payment.failed" && event.orderId) {
    await prisma.order.updateMany({ where: { id: event.orderId, status: "payment_pending" }, data: { status: "payment_failed" } });
    await prisma.payment.updateMany({ where: { orderId: event.orderId }, data: { status: "failed" } });
  }
  return NextResponse.json({ received: true });
}
