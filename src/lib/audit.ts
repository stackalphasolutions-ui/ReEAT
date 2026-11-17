// Audit log — spec §4/§9: append-only. Every approval, state change, refund,
// payout and bank-detail change is recorded with who, what and when.
import { prisma } from "./db";

export async function audit(actorUserId: string | null, actorLabel: string, action: string, entity: string, entityId: string, before?: unknown, after?: unknown) {
  await prisma.auditLog.create({
    data: { actorUserId, actorLabel, action, entity, entityId, before: before as never, after: after as never },
  });
}
