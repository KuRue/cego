import { createHash, timingSafeEqual } from "crypto";
import { createSocket } from "dgram";
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

function getNtpOffsetMs(server: string, timeoutMs = 3000): Promise<number | null> {
  return new Promise((resolve) => {
    let socket: ReturnType<typeof createSocket> | null = null;
    const timer = setTimeout(() => { socket?.close(); resolve(null); }, timeoutMs);
    try {
      socket = createSocket("udp4");
      const ntpData = Buffer.alloc(48, 0);
      ntpData[0] = 0x1b;

      const sendTime = Date.now();

      socket.on("message", (msg: Buffer) => {
        clearTimeout(timer);
        socket!.close();
        const secsSince1900 = msg.readUInt32BE(40);
        const ntpEpochMs = (secsSince1900 - 2208988800) * 1000;
        const roundTrip = Date.now() - sendTime;
        const offset = ntpEpochMs - (sendTime + Math.round(roundTrip / 2));
        resolve(offset);
      });

      socket.on("error", () => { clearTimeout(timer); socket?.close(); resolve(null); });
      socket.send(ntpData, 123, server);
    } catch {
      clearTimeout(timer);
      socket?.close();
      resolve(null);
    }
  });
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

  const ntpOffset = await getNtpOffsetMs("time.google.com");

  if (ntpOffset !== null && Math.abs(ntpOffset) > 30_000) {
    console.warn(`[cron] clock drift detected: ${ntpOffset}ms offset from NTP`);
  }

  const [deadlineResult, notificationRetryResult] = await Promise.all([
    expirePastDeadlineRsvps(),
    retryFailedNotifications(),
  ]);

  return NextResponse.json({
    ok: true,
    processedAt: new Date().toISOString(),
    ...(ntpOffset !== null ? { clockOffsetMs: ntpOffset } : {}),
    ...deadlineResult,
    notificationRetries: notificationRetryResult,
  });
}
