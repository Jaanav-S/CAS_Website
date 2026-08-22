import { headers } from "next/headers";

/**
 * The site's public base URL, e.g. `https://texnnet.com` — used for every
 * absolute link the app hands out (sign-up links, the Google redirect, the
 * post-login redirect).
 *
 * In production this must come from the `APP_URL` environment variable, because
 * behind a reverse proxy the request's own Host resolves to the container's
 * internal address (0.0.0.0:3000). Only when APP_URL is unset (local dev) does
 * it fall back to the request headers. Changing domains later = change APP_URL.
 */
function configured(): string | null {
  const value = process.env.APP_URL?.trim().replace(/\/+$/, "");
  return value || null;
}

/** For server components / pages (reads the incoming request headers). */
export async function appOrigin(): Promise<string> {
  const env = configured();
  if (env) return env;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("0.0.0.0");
  const proto = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}

/** For route handlers that already hold the request. */
export function appOriginFrom(request: {
  headers: Headers;
  nextUrl: { origin: string };
}): string {
  const env = configured();
  if (env) return env;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const local = host.startsWith("localhost") || host.startsWith("0.0.0.0");
    const proto =
      request.headers.get("x-forwarded-proto") ?? (local ? "http" : "https");
    return `${proto}://${host}`;
  }
  return request.nextUrl.origin;
}
