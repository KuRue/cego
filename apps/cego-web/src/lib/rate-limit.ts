import { NextResponse } from "next/server";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  identity?: string;
};

export type { RateLimitOptions };

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

const buckets = new Map<string, Bucket>();

const TRUSTED_HEADER = process.env.TRUSTED_PROXY_HEADER?.trim().toLowerCase() || null;

export function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const identity = options.identity || readClientAddress(request);
  const bucketKey = `${options.key}:${identity}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { ok: true };
  }

  bucket.count += 1;

  if (bucket.count <= options.limit) {
    return { ok: true };
  }

  return {
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function rateLimitResponse(result: Extract<RateLimitResult, { ok: false }>) {
  return NextResponse.json(
    { error: "Too many requests." },
    {
      status: 429,
      headers: {
        "retry-after": String(result.retryAfterSeconds),
      },
    },
  );
}

function readClientAddress(request: Request): string {
  if (!TRUSTED_HEADER) return "unknown";

  const value = request.headers.get(TRUSTED_HEADER)?.trim();
  if (!value) return "unknown";

  return TRUSTED_HEADER === "x-forwarded-for"
    ? value.split(",")[0]?.trim() || "unknown"
    : value;
}

function pruneExpiredBuckets(now: number): void {
  if (buckets.size < 10_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
