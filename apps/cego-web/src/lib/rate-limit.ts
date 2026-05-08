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
  if (!TRUSTED_HEADER) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "TRUSTED_PROXY_HEADER is required in production for rate limiting.",
      );
    }

    return "dev:unknown";
  }

  const value = request.headers.get(TRUSTED_HEADER)?.trim();
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Trusted proxy header "${TRUSTED_HEADER}" was not present on a rate-limited request.`,
      );
    }

    return `dev:missing:${TRUSTED_HEADER}`;
  }

  const address =
    TRUSTED_HEADER === "x-forwarded-for"
      ? value.split(",")[0]?.trim()
      : value;

  if (!address) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Trusted proxy header "${TRUSTED_HEADER}" did not contain a client address.`,
      );
    }

    return `dev:empty:${TRUSTED_HEADER}`;
  }

  return address;
}

function pruneExpiredBuckets(now: number): void {
  if (buckets.size < 10_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
