import { getDb, events, and, eq, sql } from "@cego/db";

export async function hasQrCheckInEvents(): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        sql`${events.status} IN ('show', 'closed')`,
        eq(events.qrCheckInEnabled, true),
      )
    )
    .limit(1);
  return !!row;
}
