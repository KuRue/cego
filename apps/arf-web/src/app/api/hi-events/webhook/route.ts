import { NextResponse } from "next/server";
import {
  handleHiEventsWebhook,
  parseHiEventsWebhookEnvelope,
  verifyHiEventsWebhookSignature,
} from "@/lib/hi-events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.HI_EVENTS_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "HI_EVENTS_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("Signature");
  const isValidSignature = verifyHiEventsWebhookSignature({
    rawBody,
    secret,
    signature,
  });

  if (!isValidSignature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    const envelope = parseHiEventsWebhookEnvelope(rawBody);
    const result = await handleHiEventsWebhook(envelope);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process webhook.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
