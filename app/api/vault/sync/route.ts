import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/supabase/server";
import { listPostizIntegrations } from "@/src/lib/postiz";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();
    const postizToken = request.headers.get("x-vault-postiz-token") || undefined;
    const postizUrl = request.headers.get("x-vault-postiz-url") || undefined;
    const postizOptions = { token: postizToken, baseUrl: postizUrl };

    const integrations = await listPostizIntegrations(postizOptions);

    return NextResponse.json({
      integrations: integrations.map((integration) => ({
        id: crypto.randomUUID(),
        postizIntegrationId: integration.id,
        identifier: integration.identifier,
        name: integration.name,
        profile: integration.profile ?? null,
        picture: integration.picture ?? null,
        disabled: integration.disabled,
        rawResponse: integration,
        fetchedAt: new Date().toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
