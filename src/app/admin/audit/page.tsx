// A10 — Audit log (append-only) and admin users.
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/actions";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function AdminAudit() {
  const session = await currentSession();
  if (!session || session.role !== "admin") redirect("/auth/signin");
  const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (<div><h1>Audit log</h1>
    {entries.map((e) => <div className="card" key={e.id}><p><b>{e.action}</b> — {e.entity} {e.entityId} · by {e.actorLabel} · {e.createdAt.toISOString()}</p></div>)}
    {entries.length === 0 && <div className="card"><p>No audit entries yet.</p></div>}
  </div>);
}
