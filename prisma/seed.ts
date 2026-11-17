// Seed — spec §2/§19: seed ONLY OMA Artisan Bakery as an under-review
// founding partner. No demo partners, listings, sales, reviews or demo data.
// OMA's contacts are from their reply of 17 Nov 2026. The admin account is
// created with a placeholder password that MUST be changed on first sign-in;
// no personal name is used anywhere — the admin is "ReEat Admin — Stack Alpha".
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { PAYMENT_GATES } from "../src/lib/thawani";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@reeat.om";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      role: "admin",
      email: adminEmail,
      fullName: "ReEat Admin — Stack Alpha",
      passwordHash: hashPassword(process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!"),
      status: "active",
    },
  });

  // OMA Artisan Bakery — founding partner, UNDER REVIEW, not verified, not live.
  // No licence documents, no bank details, no listings: the licence gate (§13)
  // must block approval until all four items are supplied and approved.
  const owner = await prisma.user.upsert({
    where: { email: "omabakery.oman@gmail.com" },
    update: {},
    create: {
      role: "partner_owner",
      email: "omabakery.oman@gmail.com",
      fullName: "OMA Artisan Bakery",
      status: "active",
    },
  });

  await prisma.partner.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      businessName: "OMA Artisan Bakery",
      displayName: "OMA Artisan Bakery",
      area: "Al Khuwair",
      address: "Al Khuwair, Muscat, Oman",
      ownerUserId: owner.id,
      status: "under_review",
      commissionPercent: 20,
      contactEmail: "omabakery.oman@gmail.com",
      contactPhone: "+968 9733 7439",
      description: "Artisan sourdough, bread and sandwiches. Founding partner for the Muscat pilot.",
    },
  });

  for (const gate of PAYMENT_GATES) {
    await prisma.paymentGate.upsert({
      where: { gate: gate.gate },
      update: {},
      create: { gate: gate.gate, label: gate.label, passed: false },
    });
  }

  const defaults: Array<[string, string]> = [
    ["commission_percent", "20"],
    ["payout_day", "Sunday"],
    ["gateway_fee_treatment", "ReEat cost — partner keeps a full 80%"],
    ["support_whatsapp", "+968 9733 7439"],
    ["support_email", "hello@reeat.om"],
    ["support_note", "ReEat support: the ReEat Team at Stack Alpha on WhatsApp and email during pickup windows."],
    ["announcement_banner", ""],
    ["partner_applications_open", "true"],
  ];
  for (const [key, value] of defaults) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value, updatedBy: admin.id } });
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      actorLabel: "Admin",
      action: "seed",
      entity: "system",
      entityId: "reeat-v1",
      after: { note: "Seeded OMA Artisan Bakery as under-review founding partner only. No demo data." },
    },
  });

  console.log("Seed complete: OMA Artisan Bakery (under_review), admin", adminEmail, ", 4 payment gates (all not passed).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
