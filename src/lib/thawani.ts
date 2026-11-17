// Thawani Pay — spec §11. SANDBOX ONLY until the four payment gates in Admin pass.
// No live keys are ever committed; they live in the hosting secret store.
// An order becomes Paid only on a verified gateway webhook — never because a
// browser reached a success page (spec §10).
export type ThawaniMode = "sandbox" | "live";

export function thawaniMode(): ThawaniMode {
  return process.env.THAWANI_MODE === "live" ? "live" : "sandbox";
}
export function thawaniIsSandbox(): boolean {
  return thawaniMode() === "sandbox";
}

export interface ThawaniCheckout {
  sessionId: string;
  checkoutUrl: string;
  mode: ThawaniMode;
  sandbox: boolean;
}

export function createThawaniCheckout(orderId: string, amountBaisa: number): ThawaniCheckout {
  const mode = thawaniMode();
  if (mode === "live" && !process.env.THAWANI_API_KEY) {
    throw new Error("Thawani live mode requires THAWANI_API_KEY in the hosting secret store.");
  }
  // Sandbox: no real charge. Live: replace this stub with a real Thawani
  // checkout-session call (POST /api/v1/checkout/session) using the live key.
  const sessionId = `thw_${mode}_${orderId}`;
  return {
    sessionId,
    checkoutUrl: mode === "sandbox"
      ? `https://uatcheckout.thawani.om/checkout/${sessionId}`
      : `https://checkout.thawani.om/checkout/${sessionId}`,
    mode,
    sandbox: mode === "sandbox",
  };
}

/** Verify a Thawani webhook signature (HMAC-SHA256 over the raw body). */
export async function verifyThawaniWebhook(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = process.env.THAWANI_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export const PAYMENT_GATES = [
  { gate: "thawani_merchant", label: "Thawani merchant account approved and live keys installed (production only)" },
  { gate: "company_licence", label: "Commercial Registration and e-commerce licence in place" },
  { gate: "staging_tests", label: "Full staging test passed, including a failed payment, a refund and a payout total check" },
  { gate: "partner_agreement", label: "Partner agreement with OMA signed, including gateway-fee treatment and payout day" },
] as const;
