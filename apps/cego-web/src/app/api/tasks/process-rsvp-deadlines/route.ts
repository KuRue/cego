import { createHash, timingSafeEqual } from "crypto";
import { getDb, sql } from "@cego/db";
import { NextResponse } from "next/server";
import { expirePastDeadlineRsvps } from "@/lib/event-actions";
import { retryFailedNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function readBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  return request.headers.get("x-cego-task-secret")?.trim() ?? "";
}

function safeEquals(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();

  return timingSafeEqual(leftHash, rightHash);
}

export async function POST(request: Request) {
  const taskSecret = process.env.CEGO_TASK_SECRET;

  if (!taskSecret) {
    return NextResponse.json(
      { ok: false, error: "CEGO_TASK_SECRET is not configured." },
      { status: 503 },
    );
  }

  if (!safeEquals(readBearerToken(request), taskSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [lock] = await tx.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(hashtext(${"cego:deadline-cron"})) AS locked`,
    );

    if (!lock?.locked) {
      return null;
    }

    const [deadlineResult, notificationRetryResult] = await Promise.all([
      expirePastDeadlineRsvps(),
      retryFailedNotifications(),
    ]);

    return {
      ...deadlineResult,
      notificationRetries: notificationRetryResult,
    };
  });

  if (!result) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "deadline task already running",
      processedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    processedAt: new Date().toISOString(),
    ...result,
  });
}
