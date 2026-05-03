type HeaderSource = {
  get(name: string): string | null;
};

export function getPublicUrl(path: string, headers?: HeaderSource): URL {
  const baseUrl = getPublicBaseUrl(headers);
  return new URL(path, baseUrl);
}

function getPublicBaseUrl(headers?: HeaderSource): URL {
  const appBaseUrl = process.env.APP_BASE_URL;

  if (process.env.NODE_ENV === "production" && appBaseUrl) {
    return new URL(appBaseUrl);
  }

  const forwardedHost = headers?.get("x-forwarded-host");
  const forwardedProto = headers?.get("x-forwarded-proto");
  const host = forwardedHost ?? headers?.get("host");

  if (host) {
    const defaultProto = host.startsWith("localhost") ? "http" : "https";
    return new URL(`${forwardedProto ?? defaultProto}://${host}`);
  }

  return new URL(appBaseUrl ?? "https://cego.example.com");
}
