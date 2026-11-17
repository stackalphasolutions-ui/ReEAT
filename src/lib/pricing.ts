// Pricing guardrails — spec §13: ReEat price must be 30–70% below the original
// price, with ~50% off as the normal expectation.
export function discountPercent(originalBaisa: number, reeatBaisa: number): number {
  if (originalBaisa <= 0) return 0;
  return ((originalBaisa - reeatBaisa) / originalBaisa) * 100;
}
export function priceWithinGuardrails(originalBaisa: number, reeatBaisa: number): { ok: boolean; reason?: string } {
  if (originalBaisa <= 0) return { ok: false, reason: "Original price must be above zero." };
  if (reeatBaisa <= 0) return { ok: false, reason: "ReEat price must be above zero." };
  if (reeatBaisa >= originalBaisa) return { ok: false, reason: "ReEat price must be below the original price." };
  const d = discountPercent(originalBaisa, reeatBaisa);
  if (d < 30) return { ok: false, reason: `Discount is ${d.toFixed(0)}% — the ReEat price must be at least 30% below the original price.` };
  if (d > 70) return { ok: false, reason: `Discount is ${d.toFixed(0)}% — the ReEat price must be no more than 70% below the original price.` };
  return { ok: true };
}
