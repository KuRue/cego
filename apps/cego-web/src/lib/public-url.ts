export function getPublicUrl(path: string): URL {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Public URL path must be root-relative.");
  }

  const baseUrl = getPublicBaseUrl();
  return new URL(path, baseUrl);
}

function getPublicBaseUrl(): URL {
  const appBaseUrl = process.env.APP_BASE_URL?.trim();

  if (!appBaseUrl) {
    throw new Error("APP_BASE_URL is required for public redirects.");
  }

  const url = new URL(appBaseUrl);
  const isLocalHttp =
    process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);

  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error("APP_BASE_URL must use HTTPS outside local development.");
  }

  return url;
}
