import { NextResponse } from "next/server";
import { DEFAULT_USER_ID, DIGEST_STATUS } from "@/src/lib/constants";
import { prisma } from "@/src/lib/db";
import { runEngagementAnalysis } from "@/src/lib/native-tasks";
import { buildAnalyticsAggregate } from "@/src/lib/postiz-analytics";
import { sendDigestEmail } from "@/src/lib/resend";
import type { Prisma } from "@prisma/client";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${expected}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.POSTIZ_API_KEY) {
    return NextResponse.json({
      status: "disabled_browser_vault_mode",
      message: "Daily cron is disabled because credentials are held client-side in browser vault",
    });
  }

  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: DEFAULT_USER_ID },
    });

    const aggregate = await buildAnalyticsAggregate(user.id);

    const activePersona = await prisma.persona.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const output = await runEngagementAnalysis({
      active_persona_md: activePersona?.personaMd ?? null,
      engagement_payload: aggregate,
    });

    const engagementSnapshot = await prisma.engagementSnapshot.create({
      data: {
        userId: user.id,
        posts: asJson(aggregate),
        unavailableFields: asJson([]),
        rawXResponse: asJson({ source: "postiz_cron", aggregate }),
      },
    });

    const insightDigest = await prisma.insightDigest.create({
      data: {
        userId: user.id,
        engagementSnapshotId: engagementSnapshot.id,
        dashboardJson: asJson(output.dashboard),
        emailSubject: output.email.subject,
        emailMarkdown: output.email.markdown,
        evidenceStrength: "postiz_cron",
        status: DIGEST_STATUS.generated,
      },
    });

    let emailSent = false;
    const recipient = user.email;
    if (recipient) {
      await sendDigestEmail(insightDigest.id, recipient);
      emailSent = true;
    }

    return NextResponse.json({
      ok: true,
      insightDigestId: insightDigest.id,
      emailSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
