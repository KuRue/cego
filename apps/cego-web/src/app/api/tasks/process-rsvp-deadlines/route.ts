import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { expirePastDeadlineRsvps } from "@/lib/event-actions";

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

  const result = await expirePastDeadlineRsvps();

  return NextResponse.json({
    ok: true,
    processedAt: new Date().toISOString(),
    ...result,
  });
}
