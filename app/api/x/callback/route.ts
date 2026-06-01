import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";
import { prisma } from "@/src/lib/db";
import { DEFAULT_USER_ID, CONNECTION_STATUS, TOKEN_EXPIRY_STATUS } from "@/src/lib/constants";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("state")?.value;
  const savedCodeVerifier = cookieStore.get("code_verifier")?.value;

  // Clear state and code verifier cookies
  cookieStore.delete("state");
  cookieStore.delete("code_verifier");

  if (!code || !state || !savedState || !savedCodeVerifier || state !== savedState) {
    return NextResponse.redirect(new URL("/settings?error=invalid_state", request.url));
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/settings?error=missing_env", request.url));
  }

  try {
    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
      scope,
    } = await client.loginWithOAuth2({
      code,
      codeVerifier: savedCodeVerifier,
      redirectUri,
    });

    const verifiedUser = await loggedClient.v2.me();

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expiresIn || 0));

    const data = {
      userId: DEFAULT_USER_ID,
      xUserId: verifiedUser.data.id,
      xUsername: verifiedUser.data.username,
      connectionStatus: CONNECTION_STATUS.connected,
      availableScopes: scope || [],
      accessToken,
      refreshToken: refreshToken || null,
      tokenExpiresAt,
      lastVerifiedAt: new Date(),
      tokenExpiryStatus: TOKEN_EXPIRY_STATUS.valid,
      credentialsSource: "oauth2_pkce",
      rawVerification: verifiedUser as any,
    };

    await prisma.connectedXAccount.upsert({
      where: { userId: DEFAULT_USER_ID },
      update: data,
      create: data,
    });

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/analytics");

    return NextResponse.redirect(new URL("/settings?success=connected", request.url));
  } catch (error: any) {
    const serializedError = {
      message: error?.message || String(error),
      name: error?.name || "Error",
    };

    const failedData = {
      userId: DEFAULT_USER_ID,
      connectionStatus: CONNECTION_STATUS.failed,
      tokenExpiryStatus: TOKEN_EXPIRY_STATUS.unknown,
      credentialsSource: "oauth2_pkce",
      rawVerification: serializedError,
      availableScopes: [],
    };

    await prisma.connectedXAccount.upsert({
      where: { userId: DEFAULT_USER_ID },
      update: failedData,
      create: failedData,
    });

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/analytics");

    return NextResponse.redirect(new URL("/settings?error=auth_failed", request.url));
  }
}
