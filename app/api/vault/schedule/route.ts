import { NextResponse } from "next/server";
import { readJsonRequest } from "@/src/lib/api-response";
import { createPostizPost, type PostizCreatePostBody } from "@/src/lib/postiz";
import { requireAuthenticatedUser } from "@/src/lib/supabase/server";
import {
  CONTENT_BATCH_STATUS,
  PLATFORM_DRAFT_BATCH_STATUS,
  PLATFORM_DRAFT_STATUS,
  PLATFORM_FORMAT,
  SCHEDULED_POST_STATUS,
  SCHEDULE_TYPE,
  SUPPORTED_PLATFORM,
  X_POST_MAX_CHARS,
} from "@/src/lib/constants";

type DraftMetadata = {
  format?: string;
  segments?: string[];
  title?: string;
  subtitle?: string;
  tags?: string[];
  content_markdown?: string;
};

function buildSettings(platform: string, metadata: DraftMetadata) {
  if (platform === SUPPORTED_PLATFORM.medium) {
    if (!metadata.title || !metadata.subtitle) {
      throw new Error("Medium drafts require title and subtitle");
    }
    return {
      __type: "medium",
      title: metadata.title,
      subtitle: metadata.subtitle,
      tags: (metadata.tags ?? []).slice(0, 4).map((tag) => ({
        value: tag.toLowerCase(),
        label: tag,
      })),
    };
  }
  if (platform === SUPPORTED_PLATFORM.x) {
    return { __type: "x", who_can_reply_post: "everyone" };
  }
  if (
    platform === SUPPORTED_PLATFORM.instagram ||
    platform === SUPPORTED_PLATFORM.instagramStandalone
  ) {
    return { __type: platform, post_type: "post", collaborators: [] };
  }
  return { __type: platform };
}

function mediaAssetsForPlatform(platform: string, media: any[]) {
  if (platform === SUPPORTED_PLATFORM.medium) {
    return [];
  }
  return media.map((item) => {
    if (!item.postizMediaId || !item.postizMediaPath) {
      throw new Error("Postiz media id and path are required before scheduling");
    }
    return {
      id: item.postizMediaId,
      path: item.postizMediaPath,
    };
  });
}

function validateDraft(platform: string, draftContent: string, metadata: DraftMetadata) {
  if (platform === SUPPORTED_PLATFORM.x) {
    if (metadata.format === PLATFORM_FORMAT.thread) {
      const segments = metadata.segments ?? [];
      if (segments.length < 2) {
        throw new Error("Thread must have at least 2 segments");
      }
      if (segments.find((segment) => segment.length > X_POST_MAX_CHARS)) {
        throw new Error(`Thread segment exceeds ${X_POST_MAX_CHARS} characters`);
      }
      return;
    }
    if (draftContent.length > X_POST_MAX_CHARS) {
      throw new Error(`Tweet exceeds ${X_POST_MAX_CHARS} characters`);
    }
    return;
  }
  if (platform === SUPPORTED_PLATFORM.medium) {
    if (!metadata.title || metadata.title.length < 2) {
      throw new Error("Medium title is required");
    }
    if (!metadata.subtitle || metadata.subtitle.length < 2) {
      throw new Error("Medium subtitle is required");
    }
    if (!metadata.content_markdown || metadata.content_markdown.trim().length === 0) {
      throw new Error("Medium content is required");
    }
    return;
  }
  if (!draftContent.trim()) {
    throw new Error("Draft content is required");
  }
}

function buildValue(platform: string, draftContent: string, metadata: DraftMetadata, media: any[]) {
  const mediaAssets = mediaAssetsForPlatform(platform, media);
  if (platform === SUPPORTED_PLATFORM.x && metadata.format === PLATFORM_FORMAT.thread) {
    return (metadata.segments ?? []).map((segment, index) => ({
      content: segment,
      image: index === 0 ? mediaAssets : [],
    }));
  }
  if (platform === SUPPORTED_PLATFORM.medium) {
    return [{ content: metadata.content_markdown ?? "", image: [] }];
  }
  return [{ content: draftContent, image: mediaAssets }];
}

function getPlatformBatchesToSchedule(contentBatch: any, contentBatchId?: string, platformBatchId?: string) {
  if (contentBatchId) {
    return contentBatch.platformBatches.filter((batch: any) =>
      batch.drafts.some((draft: any) => !draft.scheduledPost),
    );
  }
  return contentBatch.platformBatches.filter((batch: any) => batch.id === platformBatchId);
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();
    const postizOptions = {
      token: request.headers.get("x-vault-postiz-token") || undefined,
      baseUrl: request.headers.get("x-vault-postiz-url") || undefined,
    };

    const body = await readJsonRequest(request);
    const {
      contentBatch,
      contentBatchId,
      platformBatchId,
      scheduleType,
      scheduledAt: scheduledAtRaw,
      integrations,
    } = body;

    if (scheduleType !== SCHEDULE_TYPE.now && scheduleType !== SCHEDULE_TYPE.schedule) {
      throw new Error("Invalid schedule type");
    }
    if (!contentBatch) {
      throw new Error("contentBatch is required");
    }

    let scheduledAt: Date | null = null;
    if (scheduleType === SCHEDULE_TYPE.schedule) {
      if (!scheduledAtRaw) {
        throw new Error("Scheduled time is required for scheduled posts");
      }
      scheduledAt = new Date(scheduledAtRaw);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new Error("Scheduled time is invalid");
      }
      if (scheduledAt.getTime() <= Date.now()) {
        throw new Error("Scheduled time must be in the future");
      }
    }

    const date = scheduleType === SCHEDULE_TYPE.now ? new Date() : (scheduledAt as Date);
    const dateIso = date.toISOString();
    const batchesToSchedule = getPlatformBatchesToSchedule(contentBatch, contentBatchId, platformBatchId);
    if (batchesToSchedule.length === 0) {
      throw new Error("All drafts in this batch have already been scheduled");
    }

    const scheduledPosts = [];
    const nextContentBatch = structuredClone(contentBatch);

    for (const batch of batchesToSchedule) {
      const integration = integrations.find(
        (item: any) => item.identifier === batch.platform && !item.disabled,
      );
      if (!integration) {
        throw new Error(`No connected Postiz integration found for platform ${batch.platform}`);
      }

      const localBatch = nextContentBatch.platformBatches.find((item: any) => item.id === batch.id);
      for (const draft of localBatch.drafts.filter((item: any) => !item.scheduledPost)) {
        const metadata = (draft.metadata ?? {}) as DraftMetadata;
        validateDraft(localBatch.platform, draft.content, metadata);

        const postizBody: PostizCreatePostBody = {
          type: scheduleType,
          date: dateIso,
          shortLink: false,
          tags: [],
          posts: [
            {
              integration: { id: integration.postizIntegrationId },
              value: buildValue(localBatch.platform, draft.content, metadata, nextContentBatch.media ?? []),
              settings: buildSettings(localBatch.platform, metadata),
            },
          ],
        };

        try {
          const response = await createPostizPost(postizBody, postizOptions);
          const responseItem = response[0];
          if (!responseItem?.postId) {
            throw new Error("Postiz did not return a postId");
          }
          const scheduledPost = {
            id: crypto.randomUUID(),
            platformDraftId: draft.id,
            postizPostId: responseItem.postId,
            postizIntegrationId: responseItem.integration ?? integration.postizIntegrationId,
            platform: localBatch.platform,
            scheduleType,
            scheduledAt: dateIso,
            status:
              scheduleType === SCHEDULE_TYPE.now
                ? SCHEDULED_POST_STATUS.posted
                : SCHEDULED_POST_STATUS.scheduled,
            errorMessage: null,
            rawPostizResponse: { request: postizBody, response },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          draft.status =
            scheduleType === SCHEDULE_TYPE.now
              ? PLATFORM_DRAFT_STATUS.posted
              : PLATFORM_DRAFT_STATUS.scheduled;
          draft.scheduledPost = scheduledPost;
          scheduledPosts.push(scheduledPost);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const scheduledPost = {
            id: crypto.randomUUID(),
            platformDraftId: draft.id,
            postizPostId: null,
            postizIntegrationId: integration.postizIntegrationId,
            platform: localBatch.platform,
            scheduleType,
            scheduledAt: dateIso,
            status: SCHEDULED_POST_STATUS.failed,
            errorMessage,
            rawPostizResponse: { request: postizBody, error: errorMessage },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          draft.status = PLATFORM_DRAFT_STATUS.failed;
          draft.scheduledPost = scheduledPost;
          scheduledPosts.push(scheduledPost);
          throw error;
        }
      }
      localBatch.status = PLATFORM_DRAFT_BATCH_STATUS.scheduled;
    }

    if (contentBatchId) {
      nextContentBatch.status = CONTENT_BATCH_STATUS.scheduled;
    }
    nextContentBatch.updatedAt = new Date().toISOString();

    return NextResponse.json({ contentBatch: nextContentBatch, scheduledPosts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
