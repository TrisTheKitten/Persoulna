import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const LOCAL_POSTIZ_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const OAUTH_STATE_COOKIE = "postiz_oauth_state";

function parsePostizFrontendUrl(value: string) {
  const candidate = value.includes("://") ? value : `https://${value}`;
  const url = new URL(candidate);
  const isLocalHost = LOCAL_POSTIZ_HOSTS.has(url.hostname);
  const isAllowedProtocol = url.protocol === "https:" || (url.protocol === "http:" && isLocalHost);

  if (!isAllowedProtocol || url.username || url.password) {
    return null;
  }

  return url;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  const frontendUrl = searchParams.get("frontend_url");

  if (!clientId || !frontendUrl) {
    return NextResponse.json(
      { error: "client_id and frontend_url query parameters are required" },
      { status: 400 }
    );
  }

  const postizUrl = parsePostizFrontendUrl(frontendUrl);
  if (!postizUrl) {
    return NextResponse.json(
      { error: "frontend_url must be a valid Postiz HTTPS URL" },
      { status: 400 }
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/postiz/oauth/callback`;

  postizUrl.pathname = "/oauth/authorize";
  postizUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    state,
    redirect_uri: redirectUri,
  }).toString();

  return NextResponse.redirect(postizUrl);
}
