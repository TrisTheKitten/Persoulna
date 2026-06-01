import { NextResponse } from "next/server";
import { runEngagementAnalysis } from "@/src/lib/native-tasks";
import { requireAuthenticatedUser } from "@/src/lib/supabase/server";
import {
  getPostizPlatformAnalytics,
  getPostizPostAnalytics,
  isSupportedPlatformIdentifier,
  listPostizIntegrations,
  listPostizPosts,
} from "@/src/lib/postiz";
import { POSTIZ_ANALYTICS_LOOKBACK_DAYS } from "@/src/lib/constants";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();

    const geminiOptions = {
      apiKey: request.headers.get("x-vault-gemini-api-key") || undefined,
      modelName: request.headers.get("x-vault-gemini-model-name") || undefined,
    };
    const postizOptions = {
      token: request.headers.get("x-vault-postiz-token") || undefined,
      baseUrl: request.headers.get("x-vault-postiz-url") || undefined,
    };

    const body = await request.json().catch(() => ({}));
    const activePersonaMd =
      typeof body.activePersonaMd === "string" ? body.activePersonaMd : null;

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - POSTIZ_ANALYTICS_LOOKBACK_DAYS);

    const integrationsRaw = await listPostizIntegrations(postizOptions);
    const integrations = integrationsRaw.filter(
      (integration) =>
        isSupportedPlatformIdentifier(integration.identifier) && !integration.disabled,
    );
    const postsRaw = await listPostizPosts(startDate, endDate, postizOptions);
    const supportedPosts = (postsRaw.posts ?? []).filter((post) =>
      isSupportedPlatformIdentifier(post.integration.providerIdentifier),
    );

    const platformResults = await Promise.all(
      integrations.map(async (integration) => ({
        integrationId: integration.id,
        data: await getPostizPlatformAnalytics(
          integration.id,
          POSTIZ_ANALYTICS_LOOKBACK_DAYS,
          postizOptions,
        ).catch(() => []),
      })),
    );
    const postResults = await Promise.all(
      supportedPosts.map(async (post) => ({
        postId: post.id,
        data: await getPostizPostAnalytics(
          post.id,
          POSTIZ_ANALYTICS_LOOKBACK_DAYS,
          postizOptions,
        ).catch(() => []),
      })),
    );

    const aggregate = {
      integrations: integrations.map((integration) => ({
        integrationId: integration.id,
        identifier: integration.identifier,
        name: integration.name,
        series:
          platformResults.find((entry) => entry.integrationId === integration.id)?.data ?? [],
      })),
      posts: supportedPosts.map((post) => ({
        postId: post.id,
        content: post.content,
        publishDate: post.publishDate,
        integration: post.integration,
        series: postResults.find((entry) => entry.postId === post.id)?.data ?? [],
      })),
    };

    const output = await runEngagementAnalysis({
      active_persona_md: activePersonaMd,
      engagement_payload: aggregate,
    }, geminiOptions);

    return NextResponse.json({
      insightDigest: {
        id: crypto.randomUUID(),
        dashboardJson: output.dashboard,
        emailSubject: output.email.subject,
        emailMarkdown: output.email.markdown,
        evidenceStrength: "postiz_aggregate",
        status: "generated",
        createdAt: new Date().toISOString(),
      },
      analyticsAggregate: aggregate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
