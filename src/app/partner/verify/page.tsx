// P5 — Verify pickup: unambiguous green/red result.
import { verifyCode, currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
export default async function Verify({ searchParams }: { searchParams: { result?: string } }) {
  const session = await currentSession();
  if (!session || !session.role.startsWith("partner")) redirect("/auth/signin");
  async function verify(form: FormData) {
    "use server";
    const result = await verifyCode(String(form.get("code") || ""));
    redirect(`/partner/verify?result=${encodeURIComponent(result.ok ? `COLLECTED: ${result.item} × ${result.quantity}` : `NOT VALID: ${result.reason}`)}`);
  }
  return (<div><h1>Verify a pickup code</h1>
    {searchParams.result && <div className="card"><p style={{ fontSize: 20 }}><b>{searchParams.result}</b></p></div>}
    <form action={verify} className="card">
      <label>Customer&apos;s pickup code</label>
      <input name="code" placeholder="e.g. K7Q2M9" required autoComplete="off" />
      <button type="submit">Verify</button>
    </form>
    <p>A code works once only. Already-used, invalid and expired codes are rejected with the reason.</p>
  </div>);
}
