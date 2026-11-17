import { NextResponse } from "next/server";
import { thawaniMode } from "@/lib/thawani";
export async function GET() {
  return NextResponse.json({ ok: true, app: "reeat-v1", payments: { gateway: "thawani", mode: thawaniMode() }, currency: "OMR", timezone: "Asia/Muscat" });
}
