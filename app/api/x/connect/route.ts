import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";

export async function GET() {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "OAuth 2.0 configuration is missing in environment variables." },
      { status: 400 }
    );
  }

  const client = new TwitterApi({
    clientId,
    clientSecret,
  });

  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    redirectUri,
    {
      scope: [
        "tweet.read",
        "users.read",
        "tweet.write",
        "media.write",
        "like.read",
        "dm.read",
        "offline.access",
      ],
    }
  );

  const cookieStore = await cookies();
  cookieStore.set("state", state, { httpOnly: false, path: "/" });
  cookieStore.set("code_verifier", codeVerifier, { httpOnly: false, path: "/" });

  return NextResponse.redirect(url);
}
