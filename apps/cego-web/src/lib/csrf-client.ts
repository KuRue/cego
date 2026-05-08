const CSRF_HEADER = "x-cego-csrf";
const CSRF_COOKIE = "cego_csrf";

export function getCsrfTokenFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  return match ? match.split("=").slice(1).join("=") : "";
}

export function csrfHeaders(): Record<string, string> {
  return { [CSRF_HEADER]: getCsrfTokenFromCookie() };
}
