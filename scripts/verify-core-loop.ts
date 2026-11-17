// Core-loop verification — spec §16 acceptance, domain level.
// Runs without a database: exercises the pure domain rules in src/lib.
// Usage: npm run verify
import assert from "node:assert";
import { formatOmr, splitOrder, omrToBaisa } from "../src/lib/money";
import { priceWithinGuardrails } from "../src/lib/pricing";
import { licenceGateCheck, canApprovePartner, validateListing, checkoutTotals, verifyPickupCode, buildPayout } from "../src/lib/domain";
import { generatePickupCode, hashPickupCode } from "../src/lib/codes";
import { createThawaniCheckout, thawaniIsSandbox } from "../src/lib/thawani";
import { todayInMuscat } from "../src/lib/time";

let step = 0;
function ok(name: string) { step++; console.log(`  ✓ ${name}`); }

console.log("ReEat v1 — core loop verification (spec §16)");

// 1. Money: OMR 3 decimals, baisa, 80/20 rounding rule.
assert.equal(omrToBaisa(1.5), 1500);
assert.equal(formatOmr(1001), "OMR 1.001");
assert.deepEqual(splitOrder(3003), { partnerShareBaisa: 2402, commissionBaisa: 601 });
assert.equal(2402 + 601, 3003, "split must sum exactly to the total");
ok("money: OMR 1.001 displays to 3 decimals; 3003 baisa splits 2402 + 601");

// 2. Seed state: OMA is under review. Licence gate blocks approval.
const gateMissing = licenceGateCheck({ municipalityLicenceApproved: false, foodSafetyApproved: false, nameAddressMatchLicence: false, bankDetailsOnFile: false });
assert.equal(gateMissing.ok, false);
assert.equal(gateMissing.missing.length, 4);
assert.equal(canApprovePartner("under_review", gateMissing).ok, false);
ok("licence gate: approval BLOCKED while licence / food-safety / bank details are missing");

// 3. After documents + bank details are approved, approval is allowed.
const gatePassed = licenceGateCheck({ municipalityLicenceApproved: true, foodSafetyApproved: true, nameAddressMatchLicence: true, bankDetailsOnFile: true });
assert.equal(gatePassed.ok, true);
assert.equal(canApprovePartner("under_review", gatePassed).ok, true);
ok("licence gate: approval allowed once all four items are approved");

// 4. Pricing guardrail 30–70% off.
assert.equal(priceWithinGuardrails(2000, 1001).ok, true); // ~50% off
assert.equal(priceWithinGuardrails(2000, 20).ok, false); // 99% off — rejected
assert.equal(priceWithinGuardrails(2000, 1800).ok, false); // 10% off — rejected
ok("pricing guardrail: ~50% off passes; 99% off and 10% off are rejected");

// 5. Listing: same-day only, partner must be verified/live.
const today = todayInMuscat();
const start = new Date(); const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
assert.equal(validateListing({ partnerStatus: "under_review", originalPriceBaisa: 2000, reeatPriceBaisa: 1001, quantity: 5, listingDateMuscat: today, todayMuscat: today, pickupStart: start, pickupEnd: end }).ok, false);
assert.equal(validateListing({ partnerStatus: "live", originalPriceBaisa: 2000, reeatPriceBaisa: 1001, quantity: 5, listingDateMuscat: today, todayMuscat: today, pickupStart: start, pickupEnd: end }).ok, true);
assert.equal(validateListing({ partnerStatus: "live", originalPriceBaisa: 2000, reeatPriceBaisa: 1001, quantity: 5, listingDateMuscat: "2026-01-01", todayMuscat: today, pickupStart: start, pickupEnd: end }).ok, false);
ok("listing: under-review partner cannot publish; live partner can; future dates rejected");

// 6. Checkout: 3 units at OMR 1.001, stock deducted only on payment success.
const totals = checkoutTotals(3, 1001, 10);
assert.deepEqual(totals, { totalBaisa: 3003, partnerShareBaisa: 2402, commissionBaisa: 601 });
assert.throws(() => checkoutTotals(11, 1001, 10), /Not enough quantity/);
ok("checkout: 3 × OMR 1.001 = OMR 3.003 (2402 partner + 601 commission); oversell blocked");

// 7. Thawani is sandbox — no real charge.
assert.equal(thawaniIsSandbox(), true);
const session = createThawaniCheckout("order-1", 3003);
assert.equal(session.sandbox, true);
assert.ok(session.checkoutUrl.includes("uatcheckout.thawani.om"));
ok("payments: Thawani sandbox mode, no live keys, no real charge");

// 8. Pickup code: single-use, unpredictable, hashed.
const code = generatePickupCode();
assert.equal(code.length, 6);
assert.notEqual(generatePickupCode(), code);
assert.equal(hashPickupCode(code), hashPickupCode(code.toLowerCase()));
assert.equal(verifyPickupCode({ orderStatus: "paid", now: new Date(), pickupEnd: end }).ok, true);
assert.equal(verifyPickupCode({ orderStatus: "collected", now: new Date(), pickupEnd: end }).ok, false);
assert.equal(verifyPickupCode({ orderStatus: "collected", now: new Date(), pickupEnd: end }).reason, "Already used — this code was already collected.");
assert.equal(verifyPickupCode({ orderStatus: "paid", now: new Date(Date.now() + 5 * 60 * 60 * 1000), pickupEnd: end }).ok, false);
ok("pickup code: single-use — second use rejected as 'Already used'; expired codes rejected");

// 9. Payout: only collected, non-refunded, not-yet-paid orders; never twice.
const orders = [
  { id: "o1", status: "collected" as const, totalBaisa: 3003, partnerShareBaisa: 2402, commissionBaisa: 601, payoutId: null, refunded: false },
  { id: "o2", status: "paid" as const, totalBaisa: 2000, partnerShareBaisa: 1600, commissionBaisa: 400, payoutId: null, refunded: false },
  { id: "o3", status: "collected" as const, totalBaisa: 1000, partnerShareBaisa: 800, commissionBaisa: 200, payoutId: null, refunded: true },
];
const payout = buildPayout(orders);
assert.deepEqual(payout.orderIds, ["o1"]);
assert.equal(payout.partnerShareBaisa, 2402);
const second = buildPayout([{ ...orders[0], payoutId: "payout-1" }, orders[1], orders[2]]);
assert.deepEqual(second.orderIds, [], "an order already in a payout must never be paid twice");
ok("payout: only collected orders count; paid-but-not-collected and refunded excluded; no double payment");

console.log(`\nAll ${step} core-loop checks passed.`);
