import "server-only";

import { headers } from "next/headers";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;
  const candidate = value.includes("://") ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (url.username || url.password) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string) {
  try {
    return LOCAL_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export async function getAppOrigin() {
  const configuredOrigin =
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeOrigin(process.env.APP_URL) ??
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeOrigin(process.env.VERCEL_URL);

  if (configuredOrigin && (process.env.NODE_ENV !== "production" || !isLocalOrigin(configuredOrigin))) {
    return configuredOrigin;
  }

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const forwardedOrigin = forwardedHost ? normalizeOrigin(`${forwardedProto}://${forwardedHost}`) : null;

  if (forwardedOrigin && (process.env.NODE_ENV !== "production" || !isLocalOrigin(forwardedOrigin))) {
    return forwardedOrigin;
  }

  const requestOrigin = normalizeOrigin(requestHeaders.get("origin") ?? undefined);
  if (requestOrigin && (process.env.NODE_ENV !== "production" || !isLocalOrigin(requestOrigin))) {
    return requestOrigin;
  }

  return null;
}
