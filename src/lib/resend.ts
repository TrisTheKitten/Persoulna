import type { Prisma } from "@prisma/client";
import { Resend } from "resend";
import { EMAIL_STATUS, RESEND_PROVIDER } from "./constants";
import { prisma } from "./db";

function markdownToHtml(markdown: string) {
  const escaped = markdown
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return escaped
    .split("\n\n")
    .map((block) => `<p>${block.replaceAll("\n", "<br />")}</p>`)
    .join("");
}

export async function sendDigestEmail(insightDigestId: string, toEmail: string) {
  const insightDigest = await prisma.insightDigest.findUniqueOrThrow({
    where: { id: insightDigestId },
  });
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required");
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: fromEmail,
    to: [toEmail],
    subject: insightDigest.emailSubject,
    html: markdownToHtml(insightDigest.emailMarkdown),
  });

  if (result.error) {
    return prisma.emailSend.create({
      data: {
        userId: insightDigest.userId,
        insightDigestId,
        toEmail,
        provider: RESEND_PROVIDER,
        sendStatus: EMAIL_STATUS.failed,
        errorMessage: result.error.message,
        rawProviderResponse: result.error as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return prisma.emailSend.create({
    data: {
      userId: insightDigest.userId,
      insightDigestId,
      toEmail,
      provider: RESEND_PROVIDER,
      providerMessageId: result.data?.id ?? null,
      sendStatus: EMAIL_STATUS.sent,
      sentAt: new Date(),
      rawProviderResponse: (result.data ?? {}) as unknown as Prisma.InputJsonValue,
    },
  });
}
