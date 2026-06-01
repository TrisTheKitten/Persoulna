import { z } from "zod";
import {
  MAX_DRAFTS_PER_PLATFORM,
  PLATFORM_FORMAT,
  SUPPORTED_PLATFORM,
} from "./constants";
import { generateStructured } from "./gemini";

const platformEnum = z.enum([
  SUPPORTED_PLATFORM.x,
  SUPPORTED_PLATFORM.linkedin,
  SUPPORTED_PLATFORM.linkedinPage,
  SUPPORTED_PLATFORM.threads,
  SUPPORTED_PLATFORM.medium,
  SUPPORTED_PLATFORM.facebook,
  SUPPORTED_PLATFORM.instagram,
  SUPPORTED_PLATFORM.instagramStandalone,
  SUPPORTED_PLATFORM.telegram,
]);

const formatEnum = z.enum([
  PLATFORM_FORMAT.tweet,
  PLATFORM_FORMAT.thread,
  PLATFORM_FORMAT.linkedinPost,
  PLATFORM_FORMAT.threadsPost,
  PLATFORM_FORMAT.mediumArticle,
  PLATFORM_FORMAT.socialPost,
]);

const parsedItemSchema = z.object({
  platform: platformEnum,
  format: formatEnum,
  count: z.number().int().min(1).max(MAX_DRAFTS_PER_PLATFORM),
});

const parsedCommandSchema = z.object({
  topic: z.string().min(1),
  constraints: z.array(z.string()),
  items: z.array(parsedItemSchema),
});

export type ParsedCommand = z.infer<typeof parsedCommandSchema>;
export type ParsedCommandItem = z.infer<typeof parsedItemSchema>;

function buildCommandPrompt(rawCommand: string) {
  return [
    "You parse a chat command for a multi-platform content creation tool.",
    "Extract the topic, the requested platforms, the format per platform, and the count.",
    "If the command does not name a supported platform, return an empty items array.",
    "Supported platforms (use exactly these identifiers):",
    `- "${SUPPORTED_PLATFORM.x}" for X (Twitter); format "${PLATFORM_FORMAT.tweet}" or "${PLATFORM_FORMAT.thread}"`,
    `- "${SUPPORTED_PLATFORM.linkedin}" for personal LinkedIn; format "${PLATFORM_FORMAT.linkedinPost}"`,
    `- "${SUPPORTED_PLATFORM.linkedinPage}" for LinkedIn company page; format "${PLATFORM_FORMAT.linkedinPost}"`,
    `- "${SUPPORTED_PLATFORM.threads}" for Threads; format "${PLATFORM_FORMAT.threadsPost}"`,
    `- "${SUPPORTED_PLATFORM.medium}" for Medium articles; format "${PLATFORM_FORMAT.mediumArticle}"`,
    `- "${SUPPORTED_PLATFORM.facebook}" for Facebook; format "${PLATFORM_FORMAT.socialPost}"`,
    `- "${SUPPORTED_PLATFORM.instagram}" for Instagram; format "${PLATFORM_FORMAT.socialPost}"`,
    `- "${SUPPORTED_PLATFORM.instagramStandalone}" for Instagram Standalone; format "${PLATFORM_FORMAT.socialPost}"`,
    `- "${SUPPORTED_PLATFORM.telegram}" for Telegram; format "${PLATFORM_FORMAT.socialPost}"`,
    `count must be a positive integer at most ${MAX_DRAFTS_PER_PLATFORM} per item.`,
    "Reject unsupported platforms. Do not invent platforms.",
    "Return strict JSON with keys: topic, constraints (array of strings), items (array of {platform, format, count}).",
    "User command:",
    rawCommand,
  ].join("\n");
}

export async function parseUserCommand(
  rawCommand: string,
  options?: { apiKey?: string; modelName?: string },
): Promise<ParsedCommand> {
  return generateStructured(
    buildCommandPrompt(rawCommand),
    parsedCommandSchema,
    options,
  );
}
