import { NextResponse } from "next/server";
import { parseUserCommand } from "@/src/lib/command-parser";
import { generatePlatformBatch } from "@/src/lib/platform-generator";
import { uploadPostizFile } from "@/src/lib/postiz";
import { summarizeImageFile } from "@/src/lib/gemini";
import { fetchPostizPostHistory } from "@/src/lib/postiz-analytics";
import { requireAuthenticatedUser } from "@/src/lib/supabase/server";
import {
  CONTENT_BATCH_STATUS,
  DEFAULT_SELECTED_PLATFORM_DRAFT_COUNT,
  IMAGE_MIME_TYPE_PREFIX,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_COUNT,
  PLATFORM_DRAFT_BATCH_STATUS,
  PLATFORM_DRAFT_STATUS,
  PLATFORM_FORMAT,
  POSTIZ_HISTORY_LOOKBACK_DAYS,
  SUPPORTED_PLATFORM,
} from "@/src/lib/constants";

function getDefaultFormatForPlatform(platform: string) {
  if (platform === SUPPORTED_PLATFORM.x) return PLATFORM_FORMAT.tweet;
  if (platform === SUPPORTED_PLATFORM.medium) return PLATFORM_FORMAT.mediumArticle;
  if (platform === SUPPORTED_PLATFORM.linkedin || platform === SUPPORTED_PLATFORM.linkedinPage) {
    return PLATFORM_FORMAT.linkedinPost;
  }
  if (platform === SUPPORTED_PLATFORM.threads) return PLATFORM_FORMAT.threadsPost;
  return PLATFORM_FORMAT.socialPost;
}

function isPlatformFormatSupported(item: { platform: string; format: string }) {
  return (
    getDefaultFormatForPlatform(item.platform) === item.format ||
    (item.platform === SUPPORTED_PLATFORM.x && item.format === PLATFORM_FORMAT.thread)
  );
}

function validateImageFiles(files: File[]) {
  if (files.length > MAX_IMAGE_UPLOAD_COUNT) {
    throw new Error(`Select up to ${MAX_IMAGE_UPLOAD_COUNT} images.`);
  }
  if (files.find((file) => file.size > MAX_IMAGE_UPLOAD_BYTES)) {
    throw new Error("Each image must be 5 MB or less.");
  }
  if (files.find((file) => !file.type.startsWith(IMAGE_MIME_TYPE_PREFIX))) {
    throw new Error("Only image files are supported.");
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function prepareContentBatchMedia(
  files: File[],
  postizOptions: { token?: string; baseUrl?: string },
  geminiOptions: { apiKey?: string; modelName?: string },
) {
  const prepared = [];
  for (const file of files) {
    const uploaded = await uploadPostizFile(file, postizOptions);
    const aiSummary = await summarizeImageFile(file, geminiOptions.apiKey, geminiOptions.modelName);
    prepared.push({
      id: crypto.randomUUID(),
      originalName: file.name,
      mimeType: file.type,
      byteSize: file.size,
      postizMediaId: uploaded.id,
      postizMediaPath: uploaded.path,
      aiSummary,
      createdAt: new Date().toISOString(),
    });
  }
  return prepared;
}

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

    const formData = await request.formData();
    const rawCommand = getString(formData, "command").trim();
    if (!rawCommand) {
      throw new Error("command is required");
    }

    const activePersonaMd = getString(formData, "active_persona_md");
    if (!activePersonaMd) {
      throw new Error("Missing active persona. Please create/activate a persona first.");
    }

    const integrations = parseJson<Array<{ identifier: string; disabled: boolean }>>(
      getString(formData, "integrations_json"),
      [],
    );
    const styleRules = parseJson(getString(formData, "style_rules_json"), null);
    const styleMemorySummaries = parseJson<string[]>(
      getString(formData, "style_memory_summaries_json"),
      [],
    );

    const imageFiles = formData.getAll("images").filter(
      (value): value is File => value instanceof File && value.size > 0,
    );
    validateImageFiles(imageFiles);

    const parsed = await parseUserCommand(rawCommand, geminiOptions);
    const selectedPlatforms = formData
      .getAll("platforms")
      .filter((value): value is string => typeof value === "string");
    const uniquePlatforms = Array.from(new Set(selectedPlatforms));
    if (uniquePlatforms.length === 0) {
      throw new Error("Select at least one social platform");
    }

    const connectedPlatforms = new Set(
      integrations
        .filter((integration) => !integration.disabled)
        .map((integration) => integration.identifier),
    );
    const unlinkedPlatform = uniquePlatforms.find(
      (platform) => !connectedPlatforms.has(platform),
    );
    if (unlinkedPlatform) {
      throw new Error(`Social platform is not linked: ${unlinkedPlatform}`);
    }

    const selectedItems = uniquePlatforms.map((platform) => {
      const parsedItem = parsed.items.find(
        (item) => item.platform === platform && isPlatformFormatSupported(item),
      );
      return {
        platform: platform as any,
        format: parsedItem?.format ?? getDefaultFormatForPlatform(platform),
        count: parsedItem?.count ?? DEFAULT_SELECTED_PLATFORM_DRAFT_COUNT,
      };
    });

    const preparedMedia = await prepareContentBatchMedia(imageFiles, postizOptions, geminiOptions);
    let recentPostizPosts: Array<{ platform: string; content: string }> = [];
    try {
      const history = await fetchPostizPostHistory(POSTIZ_HISTORY_LOOKBACK_DAYS, postizOptions);
      recentPostizPosts = history.map((post) => ({
        platform: post.integration.providerIdentifier,
        content: post.content,
      }));
    } catch {
      recentPostizPosts = [];
    }

    const context = {
      topic: parsed.topic,
      constraints: parsed.constraints,
      activePersonaMd,
      styleRules,
      styleMemorySummaries,
      recentPostizPosts,
      imageSummaries: preparedMedia.map((media) => ({
        fileName: media.originalName,
        summary: media.aiSummary,
      })),
    };

    const contentBatchId = crypto.randomUUID();
    const platformBatches = [];

    for (const item of selectedItems) {
      const generated = await generatePlatformBatch(item, context, geminiOptions);
      const platformBatchId = crypto.randomUUID();
      platformBatches.push({
        id: platformBatchId,
        contentBatchId,
        platform: item.platform,
        format: item.format,
        requestedCount: item.count,
        status: PLATFORM_DRAFT_BATCH_STATUS.generated,
        createdAt: new Date().toISOString(),
        drafts: generated.drafts.map((draft, index) => {
          const variantName = draft.variantName || `Variant ${index + 1}`;
          if (draft.kind === "tweet") {
            return {
              id: crypto.randomUUID(),
              platformBatchId,
              variantName,
              content: draft.content,
              metadata: { format: item.format },
              status: PLATFORM_DRAFT_STATUS.draft,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              scheduledPost: null,
            };
          }
          if (draft.kind === "thread") {
            return {
              id: crypto.randomUUID(),
              platformBatchId,
              variantName,
              content: draft.segments.join("\n\n"),
              metadata: { format: item.format, segments: draft.segments },
              status: PLATFORM_DRAFT_STATUS.draft,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              scheduledPost: null,
            };
          }
          if (
            draft.kind === "linkedin_post" ||
            draft.kind === "threads_post" ||
            draft.kind === "social_post"
          ) {
            return {
              id: crypto.randomUUID(),
              platformBatchId,
              variantName,
              content: draft.content,
              metadata: { format: item.format },
              status: PLATFORM_DRAFT_STATUS.draft,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              scheduledPost: null,
            };
          }
          return {
            id: crypto.randomUUID(),
            platformBatchId,
            variantName,
            content: draft.contentMarkdown,
            metadata: {
              format: item.format,
              title: draft.title,
              subtitle: draft.subtitle,
              tags: draft.tags,
              content_markdown: draft.contentMarkdown,
            },
            status: PLATFORM_DRAFT_STATUS.draft,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            scheduledPost: null,
          };
        }),
      });
    }

    return NextResponse.json({
      contentBatch: {
        id: contentBatchId,
        rawCommand,
        parsedCommand: { ...parsed, items: selectedItems },
        status: CONTENT_BATCH_STATUS.generated,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        media: preparedMedia,
        platformBatches,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
