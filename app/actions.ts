"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CONTENT_BATCH_STATUS,
  DEFAULT_SELECTED_PLATFORM_DRAFT_COUNT,
  IMAGE_MIME_TYPE_PREFIX,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_COUNT,
  MEMORY_SYNC_STATUS,
  PERSONA_STATUS,
  PLATFORM_DRAFT_BATCH_STATUS,
  PLATFORM_DRAFT_STATUS,
  PLATFORM_FORMAT,
  POSTIZ_HISTORY_LOOKBACK_DAYS,
  SCHEDULE_TYPE,
  SUPPORTED_PLATFORM,
} from "@/src/lib/constants";
import { parseUserCommand, type ParsedCommandItem } from "@/src/lib/command-parser";
import { prisma } from "@/src/lib/db";
import { summarizeImageFile } from "@/src/lib/gemini";
import {
  runEngagementAnalysis,
  runPersonaBuild,
  syncWritingExamplesToNativeMemory,
} from "@/src/lib/native-tasks";
import {
  generatePlatformBatch,
  type PlatformGenerationContext,
} from "@/src/lib/platform-generator";
import {
  fetchPostizPostHistory,
  syncPostizIntegrations,
} from "@/src/lib/postiz-analytics";
import { uploadPostizFile } from "@/src/lib/postiz";
import { schedulePlatformBatch } from "@/src/lib/postiz-scheduler";
import { ensureRuntimeSetup } from "@/src/lib/user";

type PreparedContentBatchMedia = {
  originalName: string;
  mimeType: string;
  byteSize: number;
  postizMediaId: string;
  postizMediaPath: string;
  aiSummary: string;
};

type PreparedWritingExampleFile = {
  fileName: string;
  mimeType: string;
  byteSize: number;
  rawText: string;
};

type ParsedWritingExampleMemory = {
  durable_memory_items: string[];
  skipped_items: string[];
  memory_summary: string;
};

const TEXT_REFERENCE_FILE_EXTENSION = ".txt";
const TEXT_REFERENCE_MIME_TYPES = new Set(["", "text/plain"]);
const MAX_WRITING_EXAMPLE_FILES = 5;
const MAX_WRITING_EXAMPLE_BYTES = 1_000_000;

const PLATFORM_FORMAT_BY_SELECTION: Record<string, ParsedCommandItem["format"]> = {
  [SUPPORTED_PLATFORM.x]: PLATFORM_FORMAT.tweet,
  [SUPPORTED_PLATFORM.linkedin]: PLATFORM_FORMAT.linkedinPost,
  [SUPPORTED_PLATFORM.linkedinPage]: PLATFORM_FORMAT.linkedinPost,
  [SUPPORTED_PLATFORM.threads]: PLATFORM_FORMAT.threadsPost,
  [SUPPORTED_PLATFORM.medium]: PLATFORM_FORMAT.mediumArticle,
  [SUPPORTED_PLATFORM.facebook]: PLATFORM_FORMAT.socialPost,
  [SUPPORTED_PLATFORM.instagram]: PLATFORM_FORMAT.socialPost,
  [SUPPORTED_PLATFORM.instagramStandalone]: PLATFORM_FORMAT.socialPost,
  [SUPPORTED_PLATFORM.telegram]: PLATFORM_FORMAT.socialPost,
};

function isRedirect(error: unknown): boolean {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function refreshDashboard() {
  revalidatePath("/");
  revalidatePath("/analytics");
  revalidatePath("/settings");
  revalidatePath("/api/dashboard");
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getImageFiles(formData: FormData) {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function getWritingExampleFiles(formData: FormData) {
  return formData
    .getAll("writing_examples")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function getDefaultFormatForPlatform(platform: string) {
  return PLATFORM_FORMAT_BY_SELECTION[platform] ?? PLATFORM_FORMAT.socialPost;
}

function isPlatformFormatSupported(item: ParsedCommandItem) {
  return (
    getDefaultFormatForPlatform(item.platform) === item.format ||
    (item.platform === SUPPORTED_PLATFORM.x && item.format === PLATFORM_FORMAT.thread)
  );
}

async function getSelectedPlatformItems(
  userId: string,
  formData: FormData,
  parsedItems: ParsedCommandItem[],
): Promise<ParsedCommandItem[]> {
  const selectedPlatforms = formData
    .getAll("platforms")
    .filter((value): value is string => typeof value === "string");
  const uniquePlatforms = Array.from(new Set(selectedPlatforms));

  if (uniquePlatforms.length === 0) {
    throw new Error("Select at least one social platform");
  }

  const connectedIntegrations = await prisma.postizIntegrationSnapshot.findMany({
    where: {
      userId,
      disabled: false,
      identifier: { in: uniquePlatforms },
    },
    select: { identifier: true },
  });
  const connectedPlatforms = new Set(
    connectedIntegrations.map((integration) => integration.identifier),
  );
  const unlinkedPlatform = uniquePlatforms.find(
    (platform) => !connectedPlatforms.has(platform),
  );

  if (unlinkedPlatform) {
    throw new Error(`Social platform is not linked: ${unlinkedPlatform}`);
  }

  return uniquePlatforms.map((platform) => {
    const parsedItem = parsedItems.find(
      (item) => item.platform === platform && isPlatformFormatSupported(item),
    );
    return {
      platform: platform as ParsedCommandItem["platform"],
      format: parsedItem?.format ?? getDefaultFormatForPlatform(platform),
      count: parsedItem?.count ?? DEFAULT_SELECTED_PLATFORM_DRAFT_COUNT,
    };
  });
}

function validateImageFiles(files: File[]) {
  if (files.length > MAX_IMAGE_UPLOAD_COUNT) {
    throw new Error(`Select up to ${MAX_IMAGE_UPLOAD_COUNT} images.`);
  }

  const oversizedFile = files.find((file) => file.size > MAX_IMAGE_UPLOAD_BYTES);
  if (oversizedFile) {
    throw new Error("Each image must be 5 MB or less.");
  }

  const unsupportedFile = files.find(
    (file) => !file.type.startsWith(IMAGE_MIME_TYPE_PREFIX),
  );
  if (unsupportedFile) {
    throw new Error("Only image files are supported.");
  }
}

function validateWritingExampleFiles(files: File[]) {
  if (files.length > MAX_WRITING_EXAMPLE_FILES) {
    throw new Error(`Upload up to ${MAX_WRITING_EXAMPLE_FILES} text files.`);
  }

  const oversizedFile = files.find(
    (file) => file.size > MAX_WRITING_EXAMPLE_BYTES,
  );
  if (oversizedFile) {
    throw new Error("Each text file must be 1 MB or less.");
  }

  const unsupportedFile = files.find((file) => {
    const fileName = file.name.toLowerCase();
    return (
      !fileName.endsWith(TEXT_REFERENCE_FILE_EXTENSION) ||
      !TEXT_REFERENCE_MIME_TYPES.has(file.type)
    );
  });
  if (unsupportedFile) {
    throw new Error("Only .txt files are supported.");
  }
}

async function prepareContentBatchMedia(files: File[]) {
  const preparedMedia: PreparedContentBatchMedia[] = [];

  for (const file of files) {
    const uploaded = await uploadPostizFile(file);
    const aiSummary = await summarizeImageFile(file);
    preparedMedia.push({
      originalName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      postizMediaId: uploaded.id,
      postizMediaPath: uploaded.path,
      aiSummary,
    });
  }

  return preparedMedia;
}

async function prepareWritingExampleFiles(files: File[]) {
  const preparedFiles: PreparedWritingExampleFile[] = [];

  for (const file of files) {
    const rawText = (await file.text()).trim();
    if (rawText.length === 0) {
      throw new Error("Text files cannot be empty.");
    }
    preparedFiles.push({
      fileName: file.name,
      mimeType: file.type || "text/plain",
      byteSize: file.size,
      rawText,
    });
  }

  return preparedFiles;
}

async function parseWritingExampleMemory(
  activePersonaMd: string | null,
  rawText: string,
): Promise<ParsedWritingExampleMemory> {
  const memory = await syncWritingExamplesToNativeMemory({
    active_persona_md: activePersonaMd,
    style_rules: null,
    writing_examples: [{ raw_text: rawText }],
  });
  return memory;
}

async function loadGenerationContext(userId: string): Promise<PlatformGenerationContext & {
  topic: string;
}> {
  const [activePersona, writingExamples] = await Promise.all([
    prisma.persona.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.writingExample.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  if (!activePersona) {
    throw new Error("Missing active persona. Please create/activate a persona first.");
  }

  let recentPostizPosts: Array<{ platform: string; content: string }> = [];
  try {
    const history = await fetchPostizPostHistory(POSTIZ_HISTORY_LOOKBACK_DAYS);
    recentPostizPosts = history.map((post) => ({
      platform: post.integration.providerIdentifier,
      content: post.content,
    }));
  } catch {
    recentPostizPosts = [];
  }

  return {
    topic: "",
    constraints: [],
    activePersonaMd: activePersona.personaMd,
    styleRules: activePersona.styleRules,
    styleMemorySummaries: writingExamples
      .map((example) => example.memorySummary)
      .filter((summary): summary is string => Boolean(summary)),
    recentPostizPosts,
    imageSummaries: [],
  };
}

export async function generateFromCommandAction(formData: FormData) {
  try {
    const { user } = await ensureRuntimeSetup();
    const rawCommand = getRequiredString(formData, "command");
    const imageFiles = getImageFiles(formData);
    validateImageFiles(imageFiles);

    const parsed = await parseUserCommand(rawCommand);
    const selectedItems = await getSelectedPlatformItems(user.id, formData, parsed.items);
    const preparedMedia = await prepareContentBatchMedia(imageFiles);

    const baseContext = await loadGenerationContext(user.id);
    const context: PlatformGenerationContext = {
      ...baseContext,
      topic: parsed.topic,
      constraints: parsed.constraints,
      imageSummaries: preparedMedia.map((media) => ({
        fileName: media.originalName,
        summary: media.aiSummary,
      })),
    };

    const contentBatch = await prisma.contentBatch.create({
      data: {
        userId: user.id,
        rawCommand,
        parsedCommand: asJson({ ...parsed, items: selectedItems }),
        status: CONTENT_BATCH_STATUS.parsed,
      },
    });

    if (preparedMedia.length > 0) {
      await prisma.contentBatchMedia.createMany({
        data: preparedMedia.map((media) => ({
          userId: user.id,
          contentBatchId: contentBatch.id,
          originalName: media.originalName,
          mimeType: media.mimeType,
          byteSize: media.byteSize,
          postizMediaId: media.postizMediaId,
          postizMediaPath: media.postizMediaPath,
          aiSummary: media.aiSummary,
        })),
      });
    }

    for (const item of selectedItems) {
      const generated = await generatePlatformBatch(item, context);

      const platformBatch = await prisma.platformDraftBatch.create({
        data: {
          contentBatchId: contentBatch.id,
          platform: item.platform,
          format: item.format,
          requestedCount: item.count,
          status: PLATFORM_DRAFT_BATCH_STATUS.generated,
        },
      });

      await prisma.platformDraft.createMany({
        data: generated.drafts.map((draft, index) => {
          const variantName = draft.variantName || `Variant ${index + 1}`;
          if (draft.kind === "tweet") {
            return {
              platformBatchId: platformBatch.id,
              variantName,
              content: draft.content,
              metadata: asJson({ format: item.format }),
              status: PLATFORM_DRAFT_STATUS.draft,
            };
          }
          if (draft.kind === "thread") {
            return {
              platformBatchId: platformBatch.id,
              variantName,
              content: draft.segments.join("\n\n"),
              metadata: asJson({ format: item.format, segments: draft.segments }),
              status: PLATFORM_DRAFT_STATUS.draft,
            };
          }
          if (
            draft.kind === "linkedin_post" ||
            draft.kind === "threads_post" ||
            draft.kind === "social_post"
          ) {
            return {
              platformBatchId: platformBatch.id,
              variantName,
              content: draft.content,
              metadata: asJson({ format: item.format }),
              status: PLATFORM_DRAFT_STATUS.draft,
            };
          }
          return {
            platformBatchId: platformBatch.id,
            variantName,
            content: draft.contentMarkdown,
            metadata: asJson({
              format: item.format,
              title: draft.title,
              subtitle: draft.subtitle,
              tags: draft.tags,
              content_markdown: draft.contentMarkdown,
            }),
            status: PLATFORM_DRAFT_STATUS.draft,
          };
        }),
      });
    }

    await prisma.contentBatch.update({
      where: { id: contentBatch.id },
      data: { status: CONTENT_BATCH_STATUS.generated },
    });

    refreshDashboard();
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    redirect(`/write?error=${encodeURIComponent(message)}` as never);
  }
}

export async function updateDraftAction(formData: FormData) {
  try {
    const draftId = getRequiredString(formData, "draft_id");
    const content = getRequiredString(formData, "content");
    const title = getOptionalString(formData, "title");
    const subtitle = getOptionalString(formData, "subtitle");
    const tagsRaw = getOptionalString(formData, "tags");
    await ensureRuntimeSetup();

    const draft = await prisma.platformDraft.findUniqueOrThrow({
      where: { id: draftId },
      include: { scheduledPost: true },
    });

    if (draft.scheduledPost) {
      throw new Error("Cannot edit a draft that has been scheduled");
    }

    const existingMetadata = (draft.metadata ?? {}) as Record<string, unknown>;
    const nextMetadata: Record<string, unknown> = { ...existingMetadata };

    if (existingMetadata.format === "medium_article") {
      if (title) nextMetadata.title = title;
      if (subtitle) nextMetadata.subtitle = subtitle;
      if (tagsRaw) {
        nextMetadata.tags = tagsRaw
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
          .slice(0, 4);
      }
      nextMetadata.content_markdown = content;
    }

    if (existingMetadata.format === "thread") {
      const segments = content
        .split(/\n\s*\n/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);
      if (segments.length < 2) {
        throw new Error("Thread must have at least 2 segments separated by blank lines");
      }
      nextMetadata.segments = segments;
    }

    await prisma.platformDraft.update({
      where: { id: draftId },
      data: {
        content,
        metadata: asJson(nextMetadata),
      },
    });

    refreshDashboard();
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    redirect(`/write?error=${encodeURIComponent(message)}` as never);
  }
}

export async function schedulePlatformBatchAction(formData: FormData) {
  try {
    const { user } = await ensureRuntimeSetup();
    const platformBatchId = getRequiredString(formData, "platform_batch_id");
    const scheduleTypeValue = getRequiredString(formData, "schedule_type");
    if (
      scheduleTypeValue !== SCHEDULE_TYPE.now &&
      scheduleTypeValue !== SCHEDULE_TYPE.schedule
    ) {
      throw new Error("Invalid schedule type");
    }

    const scheduledAtRaw = getOptionalString(formData, "scheduled_at");
    let scheduledAt: Date | null = null;
    if (scheduleTypeValue === SCHEDULE_TYPE.schedule) {
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

    await schedulePlatformBatch({
      userId: user.id,
      platformBatchId,
      scheduleType: scheduleTypeValue,
      scheduledAt,
    });

    refreshDashboard();
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    redirect(`/write?error=${encodeURIComponent(message)}` as never);
  }
}

export async function scheduleContentBatchAction(formData: FormData) {
  try {
    const { user } = await ensureRuntimeSetup();
    const contentBatchId = getRequiredString(formData, "content_batch_id");
    const scheduleTypeValue = getRequiredString(formData, "schedule_type");
    if (
      scheduleTypeValue !== SCHEDULE_TYPE.now &&
      scheduleTypeValue !== SCHEDULE_TYPE.schedule
    ) {
      throw new Error("Invalid schedule type");
    }

    const scheduledAtRaw = getOptionalString(formData, "scheduled_at");
    let scheduledAt: Date | null = null;
    if (scheduleTypeValue === SCHEDULE_TYPE.schedule) {
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

    const contentBatch = await prisma.contentBatch.findFirstOrThrow({
      where: { id: contentBatchId, userId: user.id },
      include: {
        platformBatches: {
          orderBy: { createdAt: "asc" },
          include: {
            drafts: {
              include: { scheduledPost: true },
            },
          },
        },
      },
    });

    const platformBatchesToSchedule = contentBatch.platformBatches.filter((batch) =>
      batch.drafts.some((draft) => !draft.scheduledPost),
    );

    if (platformBatchesToSchedule.length === 0) {
      throw new Error("All drafts in this batch have already been scheduled");
    }

    for (const platformBatch of platformBatchesToSchedule) {
      await schedulePlatformBatch({
        userId: user.id,
        platformBatchId: platformBatch.id,
        scheduleType: scheduleTypeValue,
        scheduledAt,
      });
    }

    await prisma.contentBatch.update({
      where: { id: contentBatch.id },
      data: { status: CONTENT_BATCH_STATUS.scheduled },
    });

    refreshDashboard();
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    redirect(`/write?error=${encodeURIComponent(message)}` as never);
  }
}

export async function syncPostizIntegrationsAction() {
  try {
    const { user } = await ensureRuntimeSetup();
    await syncPostizIntegrations(user.id);
    refreshDashboard();
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    redirect(`/settings?error=${encodeURIComponent(message)}` as never);
  }
}

export async function refreshAnalyticsAction() {
  try {
    const { user } = await ensureRuntimeSetup();
    const { buildAnalyticsAggregate } = await import(
      "@/src/lib/postiz-analytics"
    );
    const aggregate = await buildAnalyticsAggregate(user.id);

    const activePersona = await prisma.persona.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    const output = await runEngagementAnalysis({
      active_persona_md: activePersona?.personaMd ?? null,
      engagement_payload: aggregate,
    });

    await prisma.insightDigest.create({
      data: {
        userId: user.id,
        engagementSnapshotId: await ensureEngagementSnapshotForAnalytics(user.id, aggregate),
        dashboardJson: asJson(output.dashboard),
        emailSubject: output.email.subject,
        emailMarkdown: output.email.markdown,
        evidenceStrength: "postiz_aggregate",
        status: "generated",
      },
    });

    refreshDashboard();
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    redirect(`/analytics?error=${encodeURIComponent(message)}` as never);
  }
}

async function ensureEngagementSnapshotForAnalytics(userId: string, aggregate: unknown) {
  const snapshot = await prisma.engagementSnapshot.create({
    data: {
      userId,
      posts: asJson(aggregate),
      unavailableFields: asJson([]),
      rawXResponse: asJson({ source: "postiz", aggregate }),
    },
  });
  return snapshot.id;
}

export async function saveSettingsAction(formData: FormData) {
  try {
    const { user } = await ensureRuntimeSetup();
    const personaText = getOptionalString(formData, "persona");
    const uploadedWritingExampleFiles = getWritingExampleFiles(formData);
    validateWritingExampleFiles(uploadedWritingExampleFiles);
    const writingExampleFiles = await prepareWritingExampleFiles(
      uploadedWritingExampleFiles,
    );
    const writingSamples = writingExampleFiles
      .map((file) => [`File: ${file.fileName}`, file.rawText].join("\n"))
      .join("\n\n");
    if (personaText) {
      const personaOutput = await runPersonaBuild({
        display_name: "Persoulna",
        main_topics: personaText,
        target_audience: "Connected channel followers",
        writing_goal: "Create useful posts across X, LinkedIn, Threads, and Medium",
        preferred_tone: "Use saved style memory",
        things_to_avoid: "Unverified claims and unwanted rewrites",
        preferred_post_length: "Per-platform appropriate",
        approval_preference: "User approves final text before scheduling",
        writing_samples: writingSamples,
      });
      const latestPersona = await prisma.persona.findFirst({
        where: { userId: user.id },
        orderBy: { version: "desc" },
      });
      const nextVersion = (latestPersona?.version ?? 0) + 1;

      await prisma.$transaction([
        prisma.persona.updateMany({
          where: { userId: user.id },
          data: {
            isActive: false,
            status: PERSONA_STATUS.generated,
          },
        }),
        prisma.persona.create({
          data: {
            userId: user.id,
            version: nextVersion,
            displayName: "Persoulna",
            mainTopics: personaText,
            targetAudience: "Connected channel followers",
            writingGoal: "Create useful posts across connected channels",
            preferredTone: "Saved style",
            thingsToAvoid: "Unverified claims",
            preferredPostLength: "Per-platform appropriate",
            approvalPreference: "Approve final text",
            personaMd: personaOutput.persona_md,
            styleRules: asJson(personaOutput.style_rules),
            memorySummary: personaOutput.memory_summary,
            status: PERSONA_STATUS.active,
            isActive: true,
            approvedAt: new Date(),
          },
        }),
      ]);
    }

    if (writingExampleFiles.length > 0) {
      const activePersona = await prisma.persona.findFirst({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: "desc" },
      });

      for (const file of writingExampleFiles) {
        const example = await prisma.writingExample.create({
          data: {
            userId: user.id,
            rawText: file.rawText,
            sourceFileName: file.fileName,
            sourceMimeType: file.mimeType,
            sourceByteSize: file.byteSize,
            memorySyncStatus: "pending",
          },
        });

        try {
          const memory = await parseWritingExampleMemory(
            activePersona?.personaMd ?? null,
            file.rawText,
          );
          await prisma.writingExample.update({
            where: { id: example.id },
            data: {
              memorySyncStatus: MEMORY_SYNC_STATUS.synced,
              durableMemoryItems: asJson(memory.durable_memory_items),
              skippedItems: asJson(memory.skipped_items),
              memorySummary: memory.memory_summary,
            },
          });
        } catch (memoryError) {
          await prisma.writingExample.update({
            where: { id: example.id },
            data: {
              memorySyncStatus: MEMORY_SYNC_STATUS.failed,
              memorySummary:
                memoryError instanceof Error ? memoryError.message : String(memoryError),
            },
          });
          throw memoryError;
        }
      }
    }

    refreshDashboard();
  } catch (error) {
    if (isRedirect(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    redirect(`/settings?error=${encodeURIComponent(message)}` as never);
  }
}
