import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { DEFAULT_USER_ID, CONNECTION_STATUS, TOKEN_EXPIRY_STATUS } from "@/src/lib/constants";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const data = {
      xUserId: null,
      xUsername: null,
      connectionStatus: CONNECTION_STATUS.missing,
      availableScopes: [] as unknown as Prisma.InputJsonValue,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      lastVerifiedAt: null,
      tokenExpiryStatus: TOKEN_EXPIRY_STATUS.unknown,
      credentialsSource: "oauth2_pkce",
      rawVerification: Prisma.DbNull as unknown as Prisma.InputJsonValue,
    };

    await prisma.connectedXAccount.upsert({
      where: { userId: DEFAULT_USER_ID },
      update: data,
      create: {
        userId: DEFAULT_USER_ID,
        ...data,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/analytics");
    revalidatePath("/api/dashboard");

    return NextResponse.redirect(new URL("/settings", request.url));
  } catch (error: any) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error?.message || "disconnect_failed")}`, request.url)
    );
  }
}
