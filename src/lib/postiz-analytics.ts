import type { Prisma } from "@prisma/client";
import {
  POSTIZ_ANALYTICS_LOOKBACK_DAYS,
  POSTIZ_ANALYTICS_SCOPE,
  POSTIZ_HISTORY_LOOKBACK_DAYS,
} from "./constants";
import { prisma } from "./db";
import {
  getPostizPlatformAnalytics,
  getPostizPostAnalytics,
  isSupportedPlatformIdentifier,
  listPostizIntegrations,
  listPostizPosts,
  type PostizAnalyticsSeries,
  type PostizListPostsItem,
} from "./postiz";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function syncPostizIntegrations(userId: string, options?: { token?: string; baseUrl?: string }) {
  const integrations = await listPostizIntegrations(options);

  await prisma.$transaction(async (tx) => {
    await tx.postizIntegrationSnapshot.deleteMany({ where: { userId } });
    for (const integration of integrations) {
      await tx.postizIntegrationSnapshot.create({
        data: {
          userId,
          postizIntegrationId: integration.id,
          identifier: integration.identifier,
          name: integration.name,
          profile: integration.profile ?? null,
          picture: integration.picture ?? null,
          disabled: integration.disabled,
          rawResponse: asJson(integration),
        },
      });
    }
  });

  return integrations;
}

export async function fetchPostizPostHistory(
  lookbackDays = POSTIZ_HISTORY_LOOKBACK_DAYS,
  options?: { token?: string; baseUrl?: string },
) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - lookbackDays);
  const result = await listPostizPosts(startDate, endDate, options);
  return result.posts ?? [];
}

export async function snapshotPostAnalytics(
  userId: string,
  postIds: string[],
  lookbackDays = POSTIZ_ANALYTICS_LOOKBACK_DAYS,
  options?: { token?: string; baseUrl?: string },
) {
  const results: Array<{ postId: string; data: PostizAnalyticsSeries[] }> = [];
  for (const postId of postIds) {
    try {
      const data = await getPostizPostAnalytics(postId, lookbackDays, options);
      await prisma.postizAnalyticsSnapshot.create({
        data: {
          userId,
          scope: POSTIZ_ANALYTICS_SCOPE.post,
          scopeId: postId,
          rawResponse: asJson(data),
        },
      });
      results.push({ postId, data });
    } catch (error) {
      await prisma.postizAnalyticsSnapshot.create({
        data: {
          userId,
          scope: POSTIZ_ANALYTICS_SCOPE.post,
          scopeId: postId,
          rawResponse: asJson({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      });
    }
  }
  return results;
}

export async function snapshotPlatformAnalytics(
  userId: string,
  integrationIds: string[],
  lookbackDays = POSTIZ_ANALYTICS_LOOKBACK_DAYS,
  options?: { token?: string; baseUrl?: string },
) {
  const results: Array<{ integrationId: string; data: PostizAnalyticsSeries[] }> = [];
  for (const integrationId of integrationIds) {
    try {
      const data = await getPostizPlatformAnalytics(integrationId, lookbackDays, options);
      await prisma.postizAnalyticsSnapshot.create({
        data: {
          userId,
          scope: POSTIZ_ANALYTICS_SCOPE.platform,
          scopeId: integrationId,
          rawResponse: asJson(data),
        },
      });
      results.push({ integrationId, data });
    } catch (error) {
      await prisma.postizAnalyticsSnapshot.create({
        data: {
          userId,
          scope: POSTIZ_ANALYTICS_SCOPE.platform,
          scopeId: integrationId,
          rawResponse: asJson({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      });
    }
  }
  return results;
}

export type AnalyticsAggregate = {
  integrations: Array<{
    integrationId: string;
    identifier: string;
    name: string;
    series: PostizAnalyticsSeries[];
  }>;
  posts: Array<{
    postId: string;
    content: string;
    publishDate: string;
    integration: PostizListPostsItem["integration"];
    series: PostizAnalyticsSeries[];
  }>;
};

export async function buildAnalyticsAggregate(
  userId: string,
  lookbackDays = POSTIZ_ANALYTICS_LOOKBACK_DAYS,
  options?: { token?: string; baseUrl?: string },
): Promise<AnalyticsAggregate> {
  const integrationsRaw = await syncPostizIntegrations(userId, options);
  const integrations = integrationsRaw.filter((integration) =>
    isSupportedPlatformIdentifier(integration.identifier) && !integration.disabled,
  );

  const platformResults = await snapshotPlatformAnalytics(
    userId,
    integrations.map((integration) => integration.id),
    lookbackDays,
    options,
  );

  const history = await fetchPostizPostHistory(lookbackDays, options);
  const supportedHistory = history.filter((post) =>
    isSupportedPlatformIdentifier(post.integration.providerIdentifier),
  );

  const postResults = await snapshotPostAnalytics(
    userId,
    supportedHistory.map((post) => post.id),
    lookbackDays,
    options,
  );

  return {
    integrations: integrations.map((integration) => ({
      integrationId: integration.id,
      identifier: integration.identifier,
      name: integration.name,
      series:
        platformResults.find((entry) => entry.integrationId === integration.id)?.data ?? [],
    })),
    posts: supportedHistory.map((post) => ({
      postId: post.id,
      content: post.content,
      publishDate: post.publishDate,
      integration: post.integration,
      series: postResults.find((entry) => entry.postId === post.id)?.data ?? [],
    })),
  };
}
