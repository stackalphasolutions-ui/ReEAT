// §19 — OMA onboarding checklist, Parts A–F. OMA does not list, and no customer
// sees OMA, until Parts A and B are complete.
const PARTS: Array<{ part: string; items: string[] }> = [
  { part: "A — Agreement and decision-makers", items: [
    "Confirm the named decision-maker at OMA and the named counter lead for daily listings and pickup verification.",
    "Agree founding terms in writing: free to join, no monthly fee, 80/20 split only when sold, weekly payouts and payout day, same-day pickup only.",
    "Agree gateway-fee treatment and refund / no-show rules explicitly — do not leave them assumed.",
    "Agree the pilot shape: 2–3 listings a day, pickup windows that suit OMA's closing routine, pilot length of 2–4 weeks, and a weekly review call.",
    "Confirm OMA's customer-facing details: display name, Al Khuwair address and map pin, opening hours, pickup point inside the bakery, and pickup instructions.",
  ]},
  { part: "B — Verification and money setup", items: [
    "Receive OMA's Muscat Municipality licence (copy) and check name, address and expiry date.",
    "Receive OMA's food-safety approval (copy) and check expiry date.",
    "Receive bank details for weekly payouts (bank, account name, IBAN) and confirm the account name matches the business or owner.",
    "Create OMA's partner record in Admin, upload documents, approve the application, and send the partner-owner invitation.",
    "OMA owner accepts the invitation, completes the profile and adds counter staff accounts.",
  ]},
  { part: "C — Menu, listings and counter readiness", items: [
    "Agree OMA's first surplus items, with photos, genuine original prices, ReEat prices within the guardrails, and allergen notes.",
    "Train OMA counter staff on staging: create a listing, find today's orders, verify a code, and handle an invalid or already-used code.",
    "Agree what happens when an item runs out, OMA closes early, or a customer arrives late — using the refund rules — and brief every counter shift.",
    "Put a small counter sign / table card in place: ReEat pickup point, show your code here.",
  ]},
  { part: "D — Technical go-live checks", items: [
    "All payment gates passed: Thawani merchant live, company / licence gates met, partner agreement signed.",
    "All staging acceptance criteria passed, and the controlled live check (one real listing, real payment, real collection, next-day reconciliation) completed.",
    "OMA's first live listings scheduled for the agreed go-live day, at a deliberately small quantity.",
    "Support cover confirmed: the ReEat Team at Stack Alpha reachable on WhatsApp during OMA's first pickup windows, with the runbook to hand.",
  ]},
  { part: "E — First week", items: [
    "Day 1: check every paid order is collected or correctly marked; resolve any code or payment issue the same day.",
    "Days 2–7: short daily check-in with OMA (listings, sell-through, counter problems).",
    "End of week 1: first payout reconciled, approved and paid, with OMA's statement checked against OMA's own record.",
  ]},
  { part: "F — Pilot review and next step", items: [
    "After 2–4 weeks and at least two clean payouts, review KPIs with OMA: sell-through, collected rate, OMA's earnings, refunds and issues.",
    "Agree in writing whether OMA continues as a regular partner, and on what listing rhythm.",
    "Only after F1–F2: start onboarding the next Tier 1 bakery, using Parts A–F again in full.",
  ]},
];
export default function Checklist() {
  return (<div><h1>OMA onboarding checklist</h1>
    <p>Founding partner: OMA Artisan Bakery, Al Khuwair, Muscat — WhatsApp +968 9733 7439 · omabakery.oman@gmail.com</p>
    <p className="notice">Do not skip Part A or Part B: OMA does not list, and no customer sees OMA, until both are complete.</p>
    {PARTS.map((p) => <div className="card" key={p.part}><h2>{p.part}</h2><ul>{p.items.map((i) => <li key={i}>☐ {i}</li>)}</ul></div>)}
  </div>);
}
