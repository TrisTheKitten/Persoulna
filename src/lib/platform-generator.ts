import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  PLATFORM_FORMAT,
  SUPPORTED_PLATFORM,
  X_POST_MAX_CHARS,
} from "./constants";
import { generateStructured } from "./gemini";
import type { ParsedCommandItem } from "./command-parser";

const RUN_TYPE = "platform_draft_generation";
const WRITING_SKILLS_DIRECTORY = "writing-skills";
const SOCIAL_WRITING_SKILL_FILE = "SKILL.md";
const WRITING_SKILL_ENCODING = "utf8";
const RECENT_POST_CONTEXT_LIMIT = 20;
const GROUNDED_TOPIC_PATTERNS = [
  /\b(current|recent|latest|today|yesterday|tomorrow|now|new|breaking|news)\b/i,
  /\b(202[6-9]|203\d)\b/,
  /\b(market|markets|trend|trends|regulation|regulatory|law|policy|election)\b/i,
  /\b(product|version|release|launch|update|comparison|compare|versus|vs)\b/i,
  /\b(event|conference|earnings|funding|acquisition|merger|startup)\b/i,
  /\b(research|source|sources|cite|citation|look up|lookup|search)\b/i,
];
const GROUNDED_CONSTRAINT_PATTERNS = [
  /\b(use|include|find|verify|fact-check|fact check|research|source|sources|cite|citation|look up|lookup|search)\b/i,
  /\b(current|recent|latest|today|202[6-9]|203\d)\b/i,
];
const UNGROUNDED_CONTENT_PATTERNS = [
  /\b(personal opinion|my opinion|personal story|rewrite|rephrase|style only|caption)\b/i,
];

const PLATFORM_WRITING_SKILL_FILES = {
  [SUPPORTED_PLATFORM.x]: "x.md",
  [SUPPORTED_PLATFORM.threads]: "threads.md",
  [SUPPORTED_PLATFORM.facebook]: "facebook.md",
  [SUPPORTED_PLATFORM.instagram]: "instagram.md",
  [SUPPORTED_PLATFORM.instagramStandalone]: "instagram.md",
  [SUPPORTED_PLATFORM.telegram]: "telegram.md",
} as const;

const PLATFORM_GENERATION_PROFILES = {
  [SUPPORTED_PLATFORM.x]: {
    label: "X (Twitter)",
    tone: "direct, sharp, and concise",
    structure: `stay within ${X_POST_MAX_CHARS} characters per tweet or thread segment`,
    hashtagRule: "avoid hashtags unless they belong in the user's existing voice",
  },
  [SUPPORTED_PLATFORM.linkedin]: {
    label: "LinkedIn",
    tone: "professional, value-led, and clear",
    structure: "use line breaks for readability and keep the post focused on one idea",
    hashtagRule: "use hashtags only when they add clear distribution value",
  },
  [SUPPORTED_PLATFORM.linkedinPage]: {
    label: "LinkedIn Page",
    tone: "professional, brand-safe, and useful",
    structure: "write from an organization or page voice with clear takeaways",
    hashtagRule: "use hashtags only when they add clear distribution value",
  },
  [SUPPORTED_PLATFORM.threads]: {
    label: "Threads",
    tone: "conversational, authentic, and lightly punctuated",
    structure: "make the post easy to read in a fast social feed",
    hashtagRule: "avoid hashtag stuffing",
  },
  [SUPPORTED_PLATFORM.medium]: {
    label: "Medium",
    tone: "editorial, reflective, and structured",
    structure: "use a clear title, subtitle, section headings, paragraphs, and lists",
    hashtagRule: "use up to 4 lowercase tags",
  },
  [SUPPORTED_PLATFORM.facebook]: {
    label: "Facebook",
    tone: "clear, personable, and community-aware",
    structure: "write a complete feed post with a natural opening and one focused takeaway",
    hashtagRule: "use hashtags sparingly",
  },
  [SUPPORTED_PLATFORM.instagram]: {
    label: "Instagram",
    tone: "visual, concise, and caption-first",
    structure: "write as a caption that can stand beside an image or carousel",
    hashtagRule: "use a small set of relevant hashtags only when useful",
  },
  [SUPPORTED_PLATFORM.instagramStandalone]: {
    label: "Instagram",
    tone: "visual, concise, and caption-first",
    structure: "write as a caption that can stand beside an image or carousel",
    hashtagRule: "use a small set of relevant hashtags only when useful",
  },
  [SUPPORTED_PLATFORM.telegram]: {
    label: "Telegram",
    tone: "direct, useful, and channel-friendly",
    structure: "write a compact update suitable for subscribers reading in chat",
    hashtagRule: "avoid hashtags unless they are part of the channel style",
  },
} as const;

const tweetItemSchema = z.object({
  variant_name: z.string().min(1),
  content: z.string().min(1),
});

const threadItemSchema = z.object({
  variant_name: z.string().min(1),
  segments: z.array(z.string().min(1)).min(2),
});

const linkedinItemSchema = z.object({
  variant_name: z.string().min(1),
  content: z.string().min(1),
});

const threadsItemSchema = z.object({
  variant_name: z.string().min(1),
  content: z.string().min(1),
});

const socialPostItemSchema = z.object({
  variant_name: z.string().min(1),
  content: z.string().min(1),
});

const mediumItemSchema = z.object({
  variant_name: z.string().min(1),
  title: z.string().min(2),
  subtitle: z.string().min(2),
  tags: z.array(z.string().min(1)).max(4),
  content_markdown: z.string().min(1),
});

type GeneratedDraft =
  | { kind: "tweet"; variantName: string; content: string }
  | { kind: "thread"; variantName: string; segments: string[] }
  | { kind: "linkedin_post"; variantName: string; content: string }
  | { kind: "threads_post"; variantName: string; content: string }
  | { kind: "social_post"; variantName: string; content: string }
  | {
      kind: "medium_article";
      variantName: string;
      title: string;
      subtitle: string;
      tags: string[];
      contentMarkdown: string;
    };

export type PlatformGenerationContext = {
  topic: string;
  constraints: string[];
  activePersonaMd: string | null;
  styleRules: unknown;
  styleMemorySummaries: string[];
  recentPostizPosts: Array<{ platform: string; content: string }>;
  imageSummaries: Array<{ fileName: string; summary: string }>;
};

export type GeneratedPlatformBatch = {
  platform: ParsedCommandItem["platform"];
  format: ParsedCommandItem["format"];
  drafts: GeneratedDraft[];
};

function readWritingSkillFile(fileName: string) {
  return readFileSync(
    join(process.cwd(), WRITING_SKILLS_DIRECTORY, fileName),
    WRITING_SKILL_ENCODING,
  ).trim();
}

function buildWritingSkillReferences() {
  return Object.entries(PLATFORM_WRITING_SKILL_FILES).reduce<
    Partial<Record<keyof typeof PLATFORM_WRITING_SKILL_FILES, string>>
  >((references, [platform, fileName]) => {
    references[platform as keyof typeof PLATFORM_WRITING_SKILL_FILES] =
      readWritingSkillFile(fileName);
    return references;
  }, {});
}

const PLATFORM_WRITING_SKILL_REFERENCES = buildWritingSkillReferences();
const SOCIAL_WRITING_SKILL_REFERENCE = readWritingSkillFile(SOCIAL_WRITING_SKILL_FILE);

function buildSharedContextBlock(context: PlatformGenerationContext) {
  return [
    `Topic: ${context.topic}`,
    `Constraints: ${context.constraints.length > 0 ? context.constraints.join("; ") : "None"}`,
    `User persona reference:\n${context.activePersonaMd ?? "None"}`,
    `User writing style rules: ${JSON.stringify(context.styleRules ?? {})}`,
    `User writing style references: ${
      context.styleMemorySummaries.length > 0
        ? context.styleMemorySummaries.join(" | ")
        : "None"
    }`,
    "Recent Postiz posts (last 90 days, excerpt):",
    context.recentPostizPosts
      .slice(0, RECENT_POST_CONTEXT_LIMIT)
      .map((post) => `- [${post.platform}] ${post.content}`)
      .join("\n") || "(none)",
    "Uploaded image context:",
    context.imageSummaries.length > 0
      ? context.imageSummaries
          .map((image) => `- ${image.fileName}: ${image.summary}`)
          .join("\n")
      : "(none)",
  ].join("\n\n");
}

function matchesAnyPattern(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function shouldUseSearchGrounding(context: PlatformGenerationContext) {
  const topic = context.topic.trim();
  const constraints = context.constraints.join(" ");
  const hasImageContext = context.imageSummaries.length > 0;
  const isImageCaptionOnly =
    hasImageContext &&
    matchesAnyPattern(`${topic} ${constraints}`, UNGROUNDED_CONTENT_PATTERNS);

  if (isImageCaptionOnly) {
    return false;
  }

  return (
    matchesAnyPattern(topic, GROUNDED_TOPIC_PATTERNS) ||
    matchesAnyPattern(constraints, GROUNDED_CONSTRAINT_PATTERNS)
  );
}

function getPlatformDisplayName(platform: string) {
  return (
    PLATFORM_GENERATION_PROFILES[platform as keyof typeof PLATFORM_GENERATION_PROFILES]
      ?.label ??
    platform
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function getPlatformGenerationProfile(platform: string) {
  return (
    PLATFORM_GENERATION_PROFILES[platform as keyof typeof PLATFORM_GENERATION_PROFILES] ?? {
      label: getPlatformDisplayName(platform),
      tone: "clear, useful, and native to the selected social channel",
      structure: "write a complete social post adapted to the destination",
      hashtagRule: "use hashtags only when they fit the destination and user's voice",
    }
  );
}

function getPlatformWritingSkill(platform: string) {
  return PLATFORM_WRITING_SKILL_REFERENCES[
    platform as keyof typeof PLATFORM_WRITING_SKILL_REFERENCES
  ];
}

function buildPlatformInstructionBlock(platform: string) {
  const profile = getPlatformGenerationProfile(platform);
  const writingSkill = getPlatformWritingSkill(platform);
  const platformWritingSkill = writingSkill
    ? `Platform writing pattern:\n${writingSkill}`
    : "Platform writing pattern: Use the platform tone, structure, tag guidance, user persona, and user writing style references.";
  return [
    `Target social platform: ${profile.label}`,
    `Platform tone: ${profile.tone}.`,
    `Platform structure: ${profile.structure}.`,
    `Tag guidance: ${profile.hashtagRule}.`,
    `Shared social writing skill:\n${SOCIAL_WRITING_SKILL_REFERENCE}`,
    platformWritingSkill,
    "Apply the platform writing format skill as the format authority after the user persona and writing style references.",
    "Adapt the same topic and persona to the platform instead of copying one generic draft across channels.",
  ].join("\n");
}

function tweetSchemaWithCount(count: number) {
  return z.object({
    drafts: z.array(tweetItemSchema).length(count),
  });
}

function threadSchemaWithCount(count: number) {
  return z.object({
    drafts: z.array(threadItemSchema).length(count),
  });
}

function linkedinSchemaWithCount(count: number) {
  return z.object({
    drafts: z.array(linkedinItemSchema).length(count),
  });
}

function threadsSchemaWithCount(count: number) {
  return z.object({
    drafts: z.array(threadsItemSchema).length(count),
  });
}

function socialPostSchemaWithCount(count: number) {
  return z.object({
    drafts: z.array(socialPostItemSchema).length(count),
  });
}

function mediumSchemaWithCount(count: number) {
  return z.object({
    drafts: z.array(mediumItemSchema).length(count),
  });
}

function generatePlatformStructured<T>(
  context: PlatformGenerationContext,
  prompt: string,
  schema: z.ZodType<T>,
  options?: { apiKey?: string; modelName?: string },
) {
  return generateStructured(prompt, schema, {
    useSearchGrounding: shouldUseSearchGrounding(context),
    ...options,
  });
}

async function generateTweets(context: PlatformGenerationContext, count: number, options?: { apiKey?: string; modelName?: string }) {
  const prompt = [
    `Generate exactly ${count} distinct X (Twitter) tweets in the user's voice.`,
    buildPlatformInstructionBlock(SUPPORTED_PLATFORM.x),
    "Return strict JSON with key drafts: an array of { variant_name, content }.",
    buildSharedContextBlock(context),
  ].join("\n\n");
  const result = await generatePlatformStructured(
    context,
    prompt,
    tweetSchemaWithCount(count),
    options,
  );
  return result.drafts.map((draft) => ({
    kind: "tweet" as const,
    variantName: draft.variant_name,
    content: draft.content,
  }));
}

async function generateThreads(context: PlatformGenerationContext, count: number, options?: { apiKey?: string; modelName?: string }) {
  const prompt = [
    `Generate exactly ${count} X (Twitter) threads in the user's voice.`,
    buildPlatformInstructionBlock(SUPPORTED_PLATFORM.x),
    "Each thread is 2-7 segments. The first segment is a strong hook.",
    "Return strict JSON with key drafts: an array of { variant_name, segments }.",
    buildSharedContextBlock(context),
  ].join("\n\n");
  const result = await generatePlatformStructured(
    context,
    prompt,
    threadSchemaWithCount(count),
    options,
  );
  return result.drafts.map((draft) => ({
    kind: "thread" as const,
    variantName: draft.variant_name,
    segments: draft.segments,
  }));
}

async function generateLinkedinPosts(
  context: PlatformGenerationContext,
  count: number,
  platform: typeof SUPPORTED_PLATFORM.linkedin | typeof SUPPORTED_PLATFORM.linkedinPage,
  options?: { apiKey?: string; modelName?: string },
) {
  const prompt = [
    `Generate exactly ${count} ${PLATFORM_GENERATION_PROFILES[platform].label} posts in the user's voice.`,
    buildPlatformInstructionBlock(platform),
    "Return strict JSON with key drafts: an array of { variant_name, content }.",
    buildSharedContextBlock(context),
  ].join("\n\n");
  const result = await generatePlatformStructured(
    context,
    prompt,
    linkedinSchemaWithCount(count),
    options,
  );
  return result.drafts.map((draft) => ({
    kind: "linkedin_post" as const,
    variantName: draft.variant_name,
    content: draft.content,
  }));
}

async function generateThreadsPosts(
  context: PlatformGenerationContext,
  count: number,
  options?: { apiKey?: string; modelName?: string },
) {
  const prompt = [
    `Generate exactly ${count} Threads posts in the user's voice.`,
    buildPlatformInstructionBlock(SUPPORTED_PLATFORM.threads),
    "Return strict JSON with key drafts: an array of { variant_name, content }.",
    buildSharedContextBlock(context),
  ].join("\n\n");
  const result = await generatePlatformStructured(
    context,
    prompt,
    threadsSchemaWithCount(count),
    options,
  );
  return result.drafts.map((draft) => ({
    kind: "threads_post" as const,
    variantName: draft.variant_name,
    content: draft.content,
  }));
}

async function generateMediumArticles(
  context: PlatformGenerationContext,
  count: number,
  options?: { apiKey?: string; modelName?: string },
) {
  const prompt = [
    `Generate exactly ${count} Medium articles in the user's voice.`,
    buildPlatformInstructionBlock(SUPPORTED_PLATFORM.medium),
    "Each article includes a clear title, a concise subtitle, up to 4 lowercase tag values, and a Markdown body.",
    "Return strict JSON with key drafts: an array of { variant_name, title, subtitle, tags, content_markdown }.",
    buildSharedContextBlock(context),
  ].join("\n\n");
  const result = await generatePlatformStructured(
    context,
    prompt,
    mediumSchemaWithCount(count),
    options,
  );
  return result.drafts.map((draft) => ({
    kind: "medium_article" as const,
    variantName: draft.variant_name,
    title: draft.title,
    subtitle: draft.subtitle,
    tags: draft.tags,
    contentMarkdown: draft.content_markdown,
  }));
}

async function generateSocialPosts(
  context: PlatformGenerationContext,
  count: number,
  platform: string,
  options?: { apiKey?: string; modelName?: string },
) {
  const prompt = [
    `Generate exactly ${count} ${getPlatformDisplayName(platform)} posts in the user's voice.`,
    buildPlatformInstructionBlock(platform),
    "Return strict JSON with key drafts: an array of { variant_name, content }.",
    buildSharedContextBlock(context),
  ].join("\n\n");
  const result = await generatePlatformStructured(
    context,
    prompt,
    socialPostSchemaWithCount(count),
    options,
  );
  return result.drafts.map((draft) => ({
    kind: "social_post" as const,
    variantName: draft.variant_name,
    content: draft.content,
  }));
}

async function withRunRecord<T>(
  runType: string,
  input: unknown,
  task: () => Promise<T>,
): Promise<T> {
  void runType;
  void input;
  return task();
}

export async function generatePlatformBatch(
  item: ParsedCommandItem,
  context: PlatformGenerationContext,
  options?: { apiKey?: string; modelName?: string },
): Promise<GeneratedPlatformBatch> {
  return withRunRecord(
    `${RUN_TYPE}:${item.platform}:${item.format}`,
    { item, context: { topic: context.topic, constraints: context.constraints } },
    async () => {
      let drafts: GeneratedDraft[];
      if (
        item.platform === SUPPORTED_PLATFORM.x &&
        item.format === PLATFORM_FORMAT.tweet
      ) {
        drafts = await generateTweets(context, item.count, options);
      } else if (
        item.platform === SUPPORTED_PLATFORM.x &&
        item.format === PLATFORM_FORMAT.thread
      ) {
        drafts = await generateThreads(context, item.count, options);
      } else if (
        (item.platform === SUPPORTED_PLATFORM.linkedin ||
          item.platform === SUPPORTED_PLATFORM.linkedinPage) &&
        item.format === PLATFORM_FORMAT.linkedinPost
      ) {
        drafts = await generateLinkedinPosts(context, item.count, item.platform, options);
      } else if (
        item.platform === SUPPORTED_PLATFORM.threads &&
        item.format === PLATFORM_FORMAT.threadsPost
      ) {
        drafts = await generateThreadsPosts(context, item.count, options);
      } else if (
        item.platform === SUPPORTED_PLATFORM.medium &&
        item.format === PLATFORM_FORMAT.mediumArticle
      ) {
        drafts = await generateMediumArticles(context, item.count, options);
      } else if (item.format === PLATFORM_FORMAT.socialPost) {
        drafts = await generateSocialPosts(context, item.count, item.platform, options);
      } else {
        throw new Error(
          `Unsupported platform and format combination: ${item.platform} ${item.format}`,
        );
      }
      return { platform: item.platform, format: item.format, drafts };
    },
  );
}
