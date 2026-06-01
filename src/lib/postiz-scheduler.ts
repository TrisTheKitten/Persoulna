import type { Prisma } from "@prisma/client";
import {
  PLATFORM_DRAFT_BATCH_STATUS,
  PLATFORM_DRAFT_STATUS,
  PLATFORM_FORMAT,
  SCHEDULE_TYPE,
  SCHEDULED_POST_STATUS,
  SUPPORTED_PLATFORM,
  X_POST_MAX_CHARS,
} from "./constants";
import { prisma } from "./db";
import {
  createPostizPost,
  type PostizCreatePostBody,
  type PostizCreatePostItem,
} from "./postiz";

type DraftMetadata = {
  format?: string;
  segments?: string[];
  title?: string;
  subtitle?: string;
  tags?: string[];
  content_markdown?: string;
};

type PostizMediaAsset = {
  id: string;
  path: string;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function buildSettings(platform: string): Record<string, unknown> {
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

function buildMediumSettings(metadata: DraftMetadata): Record<string, unknown> {
  if (!metadata.title || !metadata.subtitle) {
    throw new Error("Medium drafts require title and subtitle");
  }
  const tags = (metadata.tags ?? []).slice(0, 4).map((tag) => ({
    value: tag.toLowerCase(),
    label: tag,
  }));
  return {
    __type: "medium",
    title: metadata.title,
    subtitle: metadata.subtitle,
    tags,
  };
}

function supportsImageAttachments(platform: string) {
  return (
    platform !== SUPPORTED_PLATFORM.medium
  );
}

function getPostizImageAssets(platform: string, mediaAssets: PostizMediaAsset[]) {
  if (!supportsImageAttachments(platform)) {
    return [];
  }

  return mediaAssets;
}

function buildPostizValue(
  platform: string,
  draftContent: string,
  metadata: DraftMetadata,
  mediaAssets: PostizMediaAsset[],
): PostizCreatePostItem["value"] {
  if (platform === SUPPORTED_PLATFORM.x && metadata.format === PLATFORM_FORMAT.thread) {
    const segments = metadata.segments ?? [];
    if (segments.length === 0) {
      throw new Error("Thread drafts require segments");
    }
    return segments.map((segment, index) => ({
      content: segment,
      image: index === 0 ? getPostizImageAssets(platform, mediaAssets) : [],
    }));
  }
  if (platform === SUPPORTED_PLATFORM.medium) {
    if (!metadata.content_markdown) {
      throw new Error("Medium drafts require content_markdown");
    }
    return [{ content: metadata.content_markdown, image: [] }];
  }
  return [
    {
      content: draftContent,
      image: getPostizImageAssets(platform, mediaAssets),
    },
  ];
}

function validateDraftBeforePostiz(
  platform: string,
  draftContent: string,
  metadata: DraftMetadata,
) {
  if (platform === SUPPORTED_PLATFORM.x) {
    if (metadata.format === PLATFORM_FORMAT.thread) {
      const segments = metadata.segments ?? [];
      if (segments.length < 2) {
        throw new Error("Thread must have at least 2 segments");
      }
      const tooLong = segments.find((segment) => segment.length > X_POST_MAX_CHARS);
      if (tooLong) {
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
  if (draftContent.trim().length === 0) {
    throw new Error("Draft content is required");
  }
}

function buildSettingsForDraft(
  platform: string,
  metadata: DraftMetadata,
): Record<string, unknown> {
  if (platform === SUPPORTED_PLATFORM.medium) {
    return buildMediumSettings(metadata);
  }
  return buildSettings(platform);
}

export type SchedulePlatformBatchInput = {
  userId: string;
  platformBatchId: string;
  scheduleType: (typeof SCHEDULE_TYPE)[keyof typeof SCHEDULE_TYPE];
  scheduledAt: Date | null;
};

export async function schedulePlatformBatch(
  input: SchedulePlatformBatchInput,
  options?: { token?: string; baseUrl?: string },
) {
  const platformBatch = await prisma.platformDraftBatch.findUniqueOrThrow({
    where: { id: input.platformBatchId },
    include: {
      contentBatch: {
        include: {
          media: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
      drafts: {
        orderBy: { createdAt: "asc" },
        include: { scheduledPost: true },
      },
    },
  });

  const integrationSnapshot = await prisma.postizIntegrationSnapshot.findFirst({
    where: { userId: input.userId, identifier: platformBatch.platform, disabled: false },
  });

  if (!integrationSnapshot) {
    throw new Error(
      `No connected Postiz integration found for platform ${platformBatch.platform}`,
    );
  }

  const draftsToSchedule = platformBatch.drafts.filter(
    (draft) => !draft.scheduledPost,
  );

  if (draftsToSchedule.length === 0) {
    throw new Error("All drafts in this batch have already been scheduled");
  }

  if (input.scheduleType === SCHEDULE_TYPE.schedule && !input.scheduledAt) {
    throw new Error("Schedule type 'schedule' requires a scheduledAt date");
  }

  const scheduledAt =
    input.scheduleType === SCHEDULE_TYPE.now
      ? new Date()
      : (input.scheduledAt as Date);

  const dateIso = scheduledAt.toISOString();
  const mediaAssets = platformBatch.contentBatch.media.map((media) => {
    if (!media.postizMediaId || !media.postizMediaPath) {
      throw new Error("Postiz media id and path are required before scheduling");
    }
    return {
      id: media.postizMediaId,
      path: media.postizMediaPath,
    };
  });

  const results: Array<{
    draftId: string;
    postizPostId: string;
    postizIntegrationId: string;
  }> = [];

  for (const draft of draftsToSchedule) {
    const metadata = (draft.metadata ?? {}) as DraftMetadata;
    validateDraftBeforePostiz(platformBatch.platform, draft.content, metadata);

    const postizBody: PostizCreatePostBody = {
      type: input.scheduleType,
      date: dateIso,
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: integrationSnapshot.postizIntegrationId },
          value: buildPostizValue(
            platformBatch.platform,
            draft.content,
            metadata,
            mediaAssets,
          ),
          settings: buildSettingsForDraft(platformBatch.platform, metadata),
        },
      ],
    };

    try {
      const response = await createPostizPost(postizBody, options);
      const responseItem = response[0];
      if (!responseItem?.postId) {
        throw new Error("Postiz did not return a postId");
      }

      await prisma.$transaction([
        prisma.scheduledPost.create({
          data: {
            userId: input.userId,
            platformDraftId: draft.id,
            postizPostId: responseItem.postId,
            postizIntegrationId: responseItem.integration ?? integrationSnapshot.postizIntegrationId,
            platform: platformBatch.platform,
            scheduleType: input.scheduleType,
            scheduledAt,
            status:
              input.scheduleType === SCHEDULE_TYPE.now
                ? SCHEDULED_POST_STATUS.posted
                : SCHEDULED_POST_STATUS.scheduled,
            rawPostizResponse: asJson({ request: postizBody, response }),
          },
        }),
        prisma.platformDraft.update({
          where: { id: draft.id },
          data: {
            status:
              input.scheduleType === SCHEDULE_TYPE.now
                ? PLATFORM_DRAFT_STATUS.posted
                : PLATFORM_DRAFT_STATUS.scheduled,
          },
        }),
      ]);

      results.push({
        draftId: draft.id,
        postizPostId: responseItem.postId,
        postizIntegrationId: responseItem.integration ?? integrationSnapshot.postizIntegrationId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await prisma.$transaction([
        prisma.scheduledPost.create({
          data: {
            userId: input.userId,
            platformDraftId: draft.id,
            postizIntegrationId: integrationSnapshot.postizIntegrationId,
            platform: platformBatch.platform,
            scheduleType: input.scheduleType,
            scheduledAt,
            status: SCHEDULED_POST_STATUS.failed,
            errorMessage,
            rawPostizResponse: asJson({ request: postizBody, error: errorMessage }),
          },
        }),
        prisma.platformDraft.update({
          where: { id: draft.id },
          data: { status: PLATFORM_DRAFT_STATUS.failed },
        }),
      ]);
      throw error;
    }
  }

  await prisma.platformDraftBatch.update({
    where: { id: platformBatch.id },
    data: { status: PLATFORM_DRAFT_BATCH_STATUS.scheduled },
  });

  return results;
}
