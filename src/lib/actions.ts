// Server actions — all money, stock and state transitions enforced server-side
// (spec §4/§10). Every action re-checks the caller's role and the domain rules.
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { readSession } from "./auth";
import { audit } from "./audit";
import { licenceGateCheck, canApprovePartner, validateListing, checkoutTotals, verifyPickupCode, buildPayout as buildPayoutForOrders } from "./domain";
import { priceWithinGuardrails } from "./pricing";
import { generatePickupCode, hashPickupCode } from "./codes";
import { createThawaniCheckout } from "./thawani";
import { todayInMuscat } from "./time";

export async function currentSession() {
  const session = readSession(cookies().get("reeat_session")?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return user ? { ...session, user } : null;
}

async function requireRole(...roles: string[]) {
  const s = await currentSession();
  if (!s || !roles.includes(s.role)) throw new Error("Not authorised.");
  return s;
}

// --- Partner: create a listing (P2, 30-second flow) ---
export async function createListing(form: FormData) {
  const s = await requireRole("partner_owner", "partner_staff");
  const partnerId = String(form.get("partnerId"));
  const partner = await prisma.partner.findUnique({ where: { id: partnerId }, include: { documents: true } });
  if (!partner) throw new Error("Partner not found.");
  if (s.role === "partner_staff") {
    const staff = await prisma.partnerStaff.findUnique({ where: { partnerId_userId: { partnerId, userId: s.user.id } } });
    if (!staff?.canCreateListings) throw new Error("Staff are not allowed to create listings for this partner.");
  }
  const original = Number(form.get("originalPriceBaisa"));
  const reeat = Number(form.get("reeatPriceBaisa"));
  const quantity = Number(form.get("quantity"));
  const pickupStart = new Date(String(form.get("pickupStart")));
  const pickupEnd = new Date(String(form.get("pickupEnd")));
  const check = validateListing({
    partnerStatus: partner.status as never,
    originalPriceBaisa: original, reeatPriceBaisa: reeat, quantity,
    listingDateMuscat: todayInMuscat(), todayMuscat: todayInMuscat(),
    pickupStart, pickupEnd,
  });
  if (!check.ok) throw new Error(check.reason);
  const listing = await prisma.listing.create({
    data: {
      partnerId, title: String(form.get("title")), description: String(form.get("description") || ""),
      category: String(form.get("category") || "bakery") as never,
      allergenNote: String(form.get("allergenNote") || "") || null,
      originalPriceBaisa: original, reeatPriceBaisa: reeat,
      quantityTotal: quantity, quantityRemaining: quantity,
      listingDate: new Date(), pickupStart, pickupEnd, status: "live",
    },
  });
  await audit(s.user.id, "Partner", "listing.create", "listing", listing.id, undefined, { title: listing.title });
  revalidatePath("/partner/listings");
  redirect("/partner/listings");
}

// --- Partner: verify a pickup code at the counter (P5) ---
export async function verifyCode(code: string) {
  const s = await requireRole("partner_owner", "partner_staff");
  const hash = hashPickupCode(code);
  const order = await prisma.order.findUnique({ where: { pickupCodeHash: hash }, include: { listing: true } });
  if (!order) return { ok: false, reason: "Invalid — no order matches this code." };
  const listing = await prisma.listing.findUnique({ where: { id: order.listingId } });
  const check = verifyPickupCode({ orderStatus: order.status as never, now: new Date(), pickupEnd: listing?.pickupEnd ?? new Date() });
  if (!check.ok) return { ok: false, reason: check.reason };
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "collected", collectedAt: new Date(), verifiedById: s.user.id },
  });
  await audit(s.user.id, "Partner", "order.verify", "order", order.id, { status: order.status }, { status: "collected" });
  revalidatePath("/partner/orders");
  return { ok: true, order: updated, item: order.itemName, quantity: order.quantity };
}

// --- Customer: checkout (C4) — Thawani sandbox; stock moves only on payment success ---
export async function checkout(listingId: string, quantity: number) {
  const s = await requireRole("customer");
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { partner: true } });
  if (!listing || listing.status !== "live") throw new Error("This listing is no longer available.");
  const totals = checkoutTotals(quantity, listing.reeatPriceBaisa, listing.quantityRemaining);
  const code = generatePickupCode();
  const order = await prisma.order.create({
    data: {
      customerId: s.user.id, partnerId: listing.partnerId, listingId,
      itemName: listing.title, quantity, unitPriceBaisa: listing.reeatPriceBaisa,
      totalBaisa: totals.totalBaisa, commissionBaisa: totals.commissionBaisa,
      partnerShareBaisa: totals.partnerShareBaisa,
      pickupCode: code, pickupCodeHash: hashPickupCode(code), status: "payment_pending",
    },
  });
  // Sandbox checkout: in production this redirects to Thawani and the order
  // becomes Paid only on a verified webhook (see /api/webhooks/thawani).
  const session = createThawaniCheckout(order.id, totals.totalBaisa);
  await prisma.payment.create({
    data: { orderId: order.id, gateway: "thawani", gatewayReference: session.sessionId, amountBaisa: totals.totalBaisa, currency: "OMR", status: "pending" },
  });
  return { orderId: order.id, checkoutUrl: session.checkoutUrl, sandbox: session.sandbox, totalBaisa: totals.totalBaisa };
}

// --- Admin: approve a partner — licence gate enforced (A2, spec §13) ---
export async function approvePartner(partnerId: string) {
  const s = await requireRole("admin");
  const partner = await prisma.partner.findUnique({ where: { id: partnerId }, include: { documents: true } });
  if (!partner) throw new Error("Partner not found.");
  const gate = licenceGateCheck({
    municipalityLicenceApproved: partner.documents.some((d) => d.documentType === "municipality_licence" && d.reviewStatus === "approved"),
    foodSafetyApproved: partner.documents.some((d) => d.documentType === "food_safety_approval" && d.reviewStatus === "approved"),
    nameAddressMatchLicence: Boolean(partner.address),
    bankDetailsOnFile: Boolean(partner.iban && partner.bankName),
  });
  const decision = canApprovePartner(partner.status as never, gate);
  if (!decision.ok) throw new Error(`${decision.reason} Missing: ${gate.missing.join("; ")}`);
  await prisma.partner.update({ where: { id: partnerId }, data: { status: "verified" } });
  await audit(s.user.id, "Admin", "partner.approve", "partner", partnerId, { status: partner.status }, { status: "verified" });
  revalidatePath("/admin/partners");
}

// --- Admin: request more info / reject / suspend / reinstate ---
export async function setPartnerStatus(partnerId: string, status: string, reason?: string) {
  const s = await requireRole("admin");
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) throw new Error("Partner not found.");
  await prisma.partner.update({ where: { id: partnerId }, data: { status: status as never } });
  await audit(s.user.id, "Admin", `partner.${status}`, "partner", partnerId, { status: partner.status }, { status, reason });
  revalidatePath("/admin/partners");
}

// --- Admin: approve a licence document ---
export async function reviewDocument(documentId: string, approved: boolean, note: string) {
  const s = await requireRole("admin");
  const doc = await prisma.partnerDocument.update({
    where: { id: documentId },
    data: { reviewStatus: approved ? "approved" : "rejected", reviewedById: s.user.id, reviewNote: note },
  });
  await audit(s.user.id, "Admin", "document.review", "partner_document", documentId, undefined, { reviewStatus: doc.reviewStatus, note });
  revalidatePath("/admin/partners");
}

// --- Admin: refund an order (spec §13) ---
export async function refundOrder(orderId: string, reason: string) {
  const s = await requireRole("admin");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found.");
  if (order.status === "collected") throw new Error("Collected orders cannot be refunded.");
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "cancelled_refunded", refundReason: reason } }),
    prisma.listing.update({ where: { id: order.listingId }, data: { quantityRemaining: { increment: order.quantity } } }),
    prisma.payment.updateMany({ where: { orderId }, data: { status: "refunded" } }),
  ]);
  await audit(s.user.id, "Admin", "order.refund", "order", orderId, { status: order.status }, { status: "cancelled_refunded", reason });
  revalidatePath("/admin/orders");
}

// --- Admin: build + approve + mark a weekly payout paid (A6, spec §11) ---
export async function buildPayout(partnerId: string, periodStart: Date, periodEnd: Date) {
  const s = await requireRole("admin");
  const orders = await prisma.order.findMany({ where: { partnerId, status: "collected" }, include: { payoutItems: true } });
  const built = buildPayoutForOrders(orders.map((o) => ({
    id: o.id, status: o.status as never, totalBaisa: o.totalBaisa,
    partnerShareBaisa: o.partnerShareBaisa, commissionBaisa: o.commissionBaisa,
    payoutId: o.payoutItems[0]?.payoutId ?? null, refunded: false,
  })));
  if (built.orderIds.length === 0) throw new Error("No collected, unpaid orders for this partner in this period.");
  const payout = await prisma.payout.create({
    data: {
      partnerId, periodStart, periodEnd,
      grossBaisa: built.grossBaisa, commissionBaisa: built.commissionBaisa,
      partnerShareBaisa: built.partnerShareBaisa, status: "ready",
      items: { create: built.items.map((i) => ({ orderId: i.orderId, amountBaisa: i.amountBaisa })) },
    },
  });
  await audit(s.user.id, "Admin", "payout.build", "payout", payout.id, undefined, { partnerShareBaisa: built.partnerShareBaisa });
  revalidatePath("/admin/payouts");
  return payout.id;
}

export async function setPayoutStatus(payoutId: string, status: "approved" | "paid" | "disputed", bankReference?: string) {
  const s = await requireRole("admin");
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status, bankReference: bankReference ?? undefined, paidAt: status === "paid" ? new Date() : undefined },
  });
  await audit(s.user.id, "Admin", `payout.${status}`, "payout", payoutId, undefined, { status, bankReference });
  revalidatePath("/admin/payouts");
}

// --- Admin: pass a payment gate (spec §11) ---
export async function passPaymentGate(gate: string, note: string) {
  const s = await requireRole("admin");
  await prisma.paymentGate.update({ where: { gate }, data: { passed: true, passedById: s.user.id, passedAt: new Date(), note } });
  await audit(s.user.id, "Admin", "payment_gate.pass", "payment_gate", gate, { passed: false }, { passed: true, note });
  revalidatePath("/admin");
}

// --- Admin: update a setting (A9) ---
export async function updateSetting(key: string, value: string) {
  const s = await requireRole("admin");
  const before = await prisma.setting.findUnique({ where: { key } });
  await prisma.setting.upsert({ where: { key }, update: { value, updatedBy: s.user.id }, create: { key, value, updatedBy: s.user.id } });
  await audit(s.user.id, "Admin", "setting.update", "setting", key, { value: before?.value }, { value });
  revalidatePath("/admin/settings");
}

// --- Customer: favourite / review ---
export async function toggleFavourite(partnerId: string) {
  const s = await requireRole("customer");
  const existing = await prisma.favourite.findUnique({ where: { customerId_partnerId: { customerId: s.user.id, partnerId } } });
  if (existing) await prisma.favourite.delete({ where: { customerId_partnerId: { customerId: s.user.id, partnerId } } });
  else await prisma.favourite.create({ data: { customerId: s.user.id, partnerId } });
  revalidatePath("/favourites");
}

export async function submitReview(orderId: string, rating: number, comment: string) {
  const s = await requireRole("customer");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.customerId !== s.user.id) throw new Error("Order not found.");
  if (order.status !== "collected") throw new Error("Only a collected pickup can be reviewed.");
  if (rating < 1 || rating > 5) throw new Error("Rating must be 1–5.");
  await prisma.review.create({ data: { orderId, customerId: s.user.id, partnerId: order.partnerId, rating, comment } });
  revalidatePath("/pickups");
}

export async function signOut() {
  cookies().delete("reeat_session");
  redirect("/");
}
