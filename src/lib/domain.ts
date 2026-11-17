// Core domain rules — spec §8, §11, §13. Pure functions so the core loop can
// be verified without a database (see scripts/verify-core-loop.ts).
import { priceWithinGuardrails } from "./pricing";
import { splitOrder } from "./money";
import { codeExpiresAt } from "./time";

export type PartnerStatus =
  | "applied" | "under_review" | "more_info_needed" | "verified" | "live"
  | "suspended" | "verification_expired" | "rejected" | "closed";

/** Licence gate — spec §13: no partner is Verified without all four items. */
export function licenceGateCheck(input: {
  municipalityLicenceApproved: boolean;
  foodSafetyApproved: boolean;
  nameAddressMatchLicence: boolean;
  bankDetailsOnFile: boolean;
}): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!input.municipalityLicenceApproved) missing.push("Muscat Municipality licence proof not approved");
  if (!input.foodSafetyApproved) missing.push("Food-safety approval not approved");
  if (!input.nameAddressMatchLicence) missing.push("Business name/address do not match the licence");
  if (!input.bankDetailsOnFile) missing.push("Bank details not on file");
  return { ok: missing.length === 0, missing };
}

export function canApprovePartner(status: PartnerStatus, gate: { ok: boolean }): { ok: boolean; reason?: string } {
  if (status !== "under_review" && status !== "more_info_needed") {
    return { ok: false, reason: `Partner is ${status} — only an application under review can be approved.` };
  }
  if (!gate.ok) return { ok: false, reason: "Licence gate not passed — do not approve on a promise." };
  return { ok: true };
}

export function canPublishListing(partnerStatus: PartnerStatus): boolean {
  return partnerStatus === "verified" || partnerStatus === "live";
}

export function validateListing(input: {
  partnerStatus: PartnerStatus;
  originalPriceBaisa: number;
  reeatPriceBaisa: number;
  quantity: number;
  listingDateMuscat: string;
  todayMuscat: string;
  pickupStart: Date;
  pickupEnd: Date;
}): { ok: boolean; reason?: string } {
  if (!canPublishListing(input.partnerStatus)) {
    return { ok: false, reason: "Partner must be verified/live before any listing is visible." };
  }
  const guard = priceWithinGuardrails(input.originalPriceBaisa, input.reeatPriceBaisa);
  if (!guard.ok) return guard;
  if (input.quantity <= 0) return { ok: false, reason: "Quantity must be at least 1." };
  if (input.listingDateMuscat !== input.todayMuscat) {
    return { ok: false, reason: "Listings are same-day only (Asia/Muscat)." };
  }
  if (input.pickupEnd <= input.pickupStart) return { ok: false, reason: "Pickup end must be after pickup start." };
  return { ok: true };
}

export type OrderStatus =
  | "payment_pending" | "payment_failed" | "paid" | "collected" | "not_collected" | "cancelled_refunded";

/** Checkout totals — stock is only deducted when payment succeeds (spec §5). */
export function checkoutTotals(quantity: number, unitPriceBaisa: number, quantityRemaining: number) {
  if (quantity <= 0) throw new Error("Quantity must be at least 1.");
  if (quantity > quantityRemaining) throw new Error("Not enough quantity left.");
  const totalBaisa = quantity * unitPriceBaisa;
  const { partnerShareBaisa, commissionBaisa } = splitOrder(totalBaisa);
  return { totalBaisa, partnerShareBaisa, commissionBaisa };
}

/** Counter verification — a code works once, inside the window + grace. */
export function verifyPickupCode(input: {
  orderStatus: OrderStatus;
  now: Date;
  pickupEnd: Date;
}): { ok: boolean; reason?: string } {
  if (input.orderStatus === "collected") return { ok: false, reason: "Already used — this code was already collected." };
  if (input.orderStatus !== "paid") return { ok: false, reason: `Invalid — order is ${input.orderStatus}.` };
  if (input.now > codeExpiresAt(input.pickupEnd)) return { ok: false, reason: "Expired — the pickup window has ended." };
  return { ok: true };
}

export type PayoutOrder = { id: string; status: OrderStatus; totalBaisa: number; partnerShareBaisa: number; commissionBaisa: number; payoutId: string | null; refunded: boolean };

/**
 * Weekly payout — spec §11/§13: only Collected, non-refunded orders that have
 * not already been paid out. Totals must equal the sum of the payout items.
 */
export function buildPayout(orders: PayoutOrder[]) {
  const eligible = orders.filter((o) => o.status === "collected" && !o.refunded && !o.payoutId);
  const grossBaisa = eligible.reduce((s, o) => s + o.totalBaisa, 0);
  const partnerShareBaisa = eligible.reduce((s, o) => s + o.partnerShareBaisa, 0);
  const commissionBaisa = eligible.reduce((s, o) => s + o.commissionBaisa, 0);
  if (grossBaisa !== partnerShareBaisa + commissionBaisa) {
    throw new Error("Payout totals do not reconcile to order-level detail.");
  }
  return {
    orderIds: eligible.map((o) => o.id),
    grossBaisa, partnerShareBaisa, commissionBaisa,
    items: eligible.map((o) => ({ orderId: o.id, amountBaisa: o.partnerShareBaisa })),
  };
}
