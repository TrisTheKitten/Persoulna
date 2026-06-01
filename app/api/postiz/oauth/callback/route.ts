import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const OAUTH_CODE_COOKIE = "postiz_oauth_code";
const OAUTH_STATE_COOKIE = "postiz_oauth_state";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/settings?error=invalid_state", request.url));
  }

  cookieStore.set(OAUTH_CODE_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.redirect(new URL("/settings?oauth=callback", request.url));
}
