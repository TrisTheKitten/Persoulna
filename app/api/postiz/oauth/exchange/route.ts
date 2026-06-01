import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const LOCAL_POSTIZ_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const OAUTH_CODE_COOKIE = "postiz_oauth_code";

function parsePostizBackendUrl(value: string) {
  const url = new URL(value);
  const isLocalHost = LOCAL_POSTIZ_HOSTS.has(url.hostname);
  const isAllowedProtocol = url.protocol === "https:" || (url.protocol === "http:" && isLocalHost);

  if (!isAllowedProtocol || url.username || url.password) {
    return null;
  }

  return url;
}

export async function POST(request: Request) {
  try {
    const { client_id, client_secret, backend_url } = await request.json();

    if (!client_id || !client_secret || !backend_url) {
      return NextResponse.json(
        { error: "client_id, client_secret, and backend_url are required" },
        { status: 400 }
      );
    }

    const postizBackendUrl = parsePostizBackendUrl(backend_url);
    if (!postizBackendUrl) {
      return NextResponse.json(
        { error: "backend_url must be a valid Postiz HTTPS URL" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const code = cookieStore.get(OAUTH_CODE_COOKIE)?.value;
    cookieStore.delete(OAUTH_CODE_COOKIE);

    if (!code) {
      return NextResponse.json(
        { error: "No authorization code found in session. Please start OAuth again." },
        { status: 400 }
      );
    }

    postizBackendUrl.pathname = "/oauth/token";
    postizBackendUrl.search = "";

    const response = await fetch(postizBackendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id,
        client_secret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `Token exchange failed: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    if (!data.access_token) {
      return NextResponse.json(
        { error: "Token exchange response did not include access_token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ access_token: data.access_token });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error during token exchange" },
      { status: 500 }
    );
  }
}
