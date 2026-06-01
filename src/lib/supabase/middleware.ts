import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

const PUBLIC_PATHS = new Set(["/", "/login", "/auth/callback"]);

type SessionCookie = {
  name: string;
  value: string;
  options?: Parameters<ReturnType<typeof NextResponse.next>["cookies"]["set"]>[2];
};

type SessionHeaders = Record<string, string>;

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/avatar") ||
    pathname.startsWith("/public")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SessionCookie[], headers: SessionHeaders = {}) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  function redirectWithSessionCookies(url: URL) {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!data.user && !PUBLIC_PATHS.has(pathname) && !isPublicAsset(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "signin");
    url.searchParams.set("next", pathname);
    return redirectWithSessionCookies(url);
  }

  if (data.user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/write";
    url.search = "";
    return redirectWithSessionCookies(url);
  }

  if (data.user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/write";
    url.search = "";
    return redirectWithSessionCookies(url);
  }

  return supabaseResponse;
}
