# ReEat v1 — Surplus food rescue for Muscat, Oman

**Good food, wasted never.**

ReEat connects bakeries, cafes and restaurants in Muscat with nearby customers
for same-day, discounted, pickup-only sales of food that would otherwise be
wasted. ReEat handles no food, holds no stock and makes no deliveries.

Built to the **ReEat v1 Production Build Spec v1.0 (17 Nov 2026)** — the spec
is the source of truth; where code and spec disagree, the spec wins.

- **Product owner:** Stack Alpha (Admin)
- **Launch city:** Muscat, Oman — timezone `Asia/Muscat` throughout
- **Founding partner:** OMA Artisan Bakery, Al Khuwair, Muscat
  (WhatsApp +968 9733 7439 · omabakery.oman@gmail.com) — seeded as
  **under review only**. No demo partners, listings, sales or demo data.
- **Currency:** OMR only, stored as integer baisa (1 OMR = 1,000 baisa),
  displayed to 3 decimals.
- **Economics:** Free to join, no monthly fee. Partner keeps 80%, ReEat
  takes 20% only when an item sells. Weekly payouts, collected orders only.
- **Payments:** Thawani Pay primary + Apple Pay / international cards.
  **No native Stripe** (it does not operate natively in Oman).
  Payments run in clearly labelled **sandbox / test mode** until the four
  payment gates in Admin are passed — no real charge is made.

## Surfaces

One Next.js codebase, three role-based areas:

| Surface | Routes | What it does |
|---|---|---|
| Customer (PWA) | `/`, `/listings/[id]`, `/pickups`, `/favourites`, `/profile`, `/help` | Today's rescue board, listing detail, checkout, My Pickups with single-use codes, favourites, reviews |
| Partner | `/partner`, `/partner/listings`, `/partner/listings/new`, `/partner/orders`, `/partner/verify`, `/partner/sales`, `/partner/documents`, `/partner/profile` | Today dashboard, 30-second listing flow, orders queue, counter code verification, sales & payouts, verification documents |
| Admin | `/admin`, `/admin/partners`, `/admin/listings`, `/admin/orders`, `/admin/payouts`, `/admin/finance`, `/admin/settings`, `/admin/audit`, `/admin/checklist` | Partner approvals with the enforced licence gate, listings moderation, orders/refunds, weekly payout queue, finance/reconciliation, payment gates, settings, audit log, OMA checklist (§19) |

## Stack

- **Frontend / backend:** Next.js 14 (App Router) + TypeScript, React 18
- **Database:** PostgreSQL via Prisma (`prisma/schema.prisma`)
- **Auth:** Customers — email/mobile + one-time code. Partner owners —
  email invitation from Admin only, no public sign-up. Admin — email +
  password + one-time code as the second factor. Sessions are signed cookies.
- **Payments:** Thawani Pay (sandbox stub in `src/lib/thawani.ts` — replace
  with a real checkout-session call using live keys when the merchant
  account is approved). An order becomes Paid **only on a verified gateway
  webhook** (`/api/webhooks/thawani`), never from a browser success page.
- **Hosting (production):** Vercel for the app + a managed PostgreSQL
  service (Railway / Render or equivalent). Do not self-host the database
  on an unmanaged server for v1.

## Money rules (spec §11)

- Partner share = 80% of the order total, rounded to the nearest baisa;
  commission = total − partner share, so the two always sum exactly.
  Example: OMR 3.003 (3,003 baisa) splits into 2,402 partner + 601 commission.
- Pricing guardrail: the ReEat price must be 30–70% below the original price.
- Only **Collected** orders count toward a payout. Not-collected and
  refunded orders are excluded. An order appears in exactly one payout —
  it can never be paid twice.
- Gateway fees are a ReEat cost by default; the partner keeps a full 80%,
  unless a written partner agreement says otherwise.

## Licence gate (spec §13)

No partner is Verified without all four: (1) current Muscat Municipality
licence, (2) food-safety approval, (3) business name/address matching the
licence, (4) bank details in the business/owner's name. If anything is
missing, use *More info needed* — never approve on a promise. The gate is
enforced in `src/lib/domain.ts` (`licenceGateCheck` / `canApprovePartner`)
and in the `approvePartner` server action.

## Setup — run locally

```bash
# 1. Prerequisites: Node.js 20+, PostgreSQL 16 (or: docker compose up -d db)
cp .env.example .env.local
#    Edit DATABASE_URL and SESSION_SECRET in .env.local.

# 2. Install, generate the Prisma client, migrate, seed
npm install
npx prisma migrate dev --name init
npm run db:seed
#    Seeds ONLY OMA Artisan Bakery (under_review) + the admin account
#    (admin@reeat.om — change SEED_ADMIN_PASSWORD / the password on first sign-in)
#    + the 4 payment gates (all not passed) + default settings. No demo data.

# 3. Run
npm run dev        # http://localhost:3000
npm run verify     # core-loop checks (spec §16, domain level, no DB needed)
npm run build      # production build (prisma generate + next build)
```

## Verification

```bash
npm run verify          # money, guardrails, licence gate, listing, checkout,
                        # pickup-code single-use, payout — all asserted
npx prisma validate     # schema validates
npm run build           # Next.js production build passes
```

The core loop that must work first (spec §8): OMA lists an item →
customer pays (Thawani sandbox) → pickup code issued → OMA verifies the
code at the counter (Collected) → Admin builds/approves/pays the weekly
payout from collected orders only.

## Deployment (Vercel + Postgres)

1. Create a Vercel project from this repo; create a managed Postgres
   database (Vercel Postgres / Railway / Render) and set `DATABASE_URL`.
2. Set secrets in the hosting platform's secret store — **never in code**:
   `SESSION_SECRET`, `THAWANI_API_KEY`, `THAWANI_PUBLISHABLE_KEY`,
   `THAWANI_WEBHOOK_SECRET`, `THAWANI_MODE=sandbox` (staging) /
   `live` (production, only after the gates pass).
3. Deploy to **staging** first; run `prisma migrate deploy` and
   `npm run db:seed`; run the §16 acceptance tests with OMA staff.
4. Pass the four payment gates in Admin (Thawani merchant live, company /
   e-commerce licence, staging tests, OMA agreement signed) — then, and
   only then, switch `THAWANI_MODE=live` in production and run the
   controlled live check: one real OMA listing, real payment, real
   collection, next-day reconciliation.
5. Point the production domain at Vercel (candidate: `reeat.om` — to be
   confirmed), enable SSL, daily database backups (14 days retained) and
   uptime monitoring with alerts to Admin.

## What remains before the first real sale

- Thawani merchant account approved + live keys (start in parallel — it
  takes the longest).
- Commercial Registration + e-commerce licence (Oman, Ministerial
  Decision 499/2023) — planning estimates only; confirm with MOCIIP / a
  local lawyer.
- Production domain, staging/production hosting, backups and monitoring.
- OMA onboarding checklist Parts A–F (in Admin → OMA checklist).
- Native iOS/Android apps, Arabic, delivery — **out of scope for v1**.

## Project layout

```
prisma/schema.prisma      PostgreSQL schema (spec §9)
prisma/seed.ts            OMA-only seed (no demo data)
src/lib/money.ts          baisa / OMR / 80-20 split
src/lib/pricing.ts        30–70% discount guardrail
src/lib/domain.ts         licence gate, listing, checkout, verify, payout rules
src/lib/thawani.ts        Thawani sandbox client + payment gates
src/lib/auth.ts           password/OTP hashing, signed sessions
src/lib/actions.ts        server actions (all state transitions, server-side)
src/app/                  customer, partner and admin pages
src/app/api/webhooks/thawani/  paid-only-on-verified-webhook
scripts/verify-core-loop.ts   spec §16 core-loop checks
```

## Support

ReEat support: the ReEat Team at Stack Alpha, on WhatsApp and email
during pickup windows. If money is wrong, stop payouts — not sales —
until reconciliation is clean, and tell affected partners the same day.
