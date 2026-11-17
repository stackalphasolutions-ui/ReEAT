// Money — spec §11. All money is integer baisa (1 OMR = 1,000 baisa).
export const BAISA_PER_OMR = 1000;

export function omrToBaisa(omr: number): number {
  return Math.round(omr * BAISA_PER_OMR);
}
export function baisaToOmr(baisa: number): number {
  return baisa / BAISA_PER_OMR;
}
/** Display OMR to exactly 3 decimals, e.g. "OMR 1.500". */
export function formatOmr(baisa: number): string {
  return `OMR ${(baisa / BAISA_PER_OMR).toFixed(3)}`;
}

/**
 * 80/20 split — spec §11 rounding rule: calculate the partner share (80%),
 * round it to the nearest baisa, and set commission = total - partner share.
 * Never round both independently, so the two always sum exactly to the total.
 */
export function splitOrder(totalBaisa: number): { partnerShareBaisa: number; commissionBaisa: number } {
  const partnerShareBaisa = Math.round(totalBaisa * 0.8);
  return { partnerShareBaisa, commissionBaisa: totalBaisa - partnerShareBaisa };
}
