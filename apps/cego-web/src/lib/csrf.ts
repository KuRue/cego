const CSRF_HEADER = "x-cego-csrf";

export function isValidCsrfRequest(request: Request): boolean {
  if (request.headers.get(CSRF_HEADER) !== "1") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  return readAllowedOrigins(request).has(origin);
}

function readAllowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  origins.add(new URL(request.url).origin);

  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (appBaseUrl) {
    try {
      origins.add(new URL(appBaseUrl).origin);
    } catch {
      // A bad APP_BASE_URL is handled by public URL helpers at redirect time.
    }
  }

  return origins;
}
