import { z } from "zod";
import {
  TASK_RUN_TYPE,
  X_POST_MAX_CHARS,
} from "./constants";
import { generateStructured } from "./gemini";

const personaOutputSchema = z.object({
  persona_md: z.string().min(1),
  style_rules: z.record(z.string(), z.unknown()),
  memory_summary: z.string().min(1),
});

const memorySyncOutputSchema = z.object({
  durable_memory_items: z.array(z.string()),
  skipped_items: z.array(z.string()),
  memory_summary: z.string().min(1),
});

const textDraftSchema = z.object({
  variant_name: z.string().min(1),
  draft_text: z.string().min(1),
  style_match_notes: z.string().optional(),
  source_post_ids_used: z.array(z.string()).optional(),
  risk_flags: z.array(z.string()).optional(),
});

const imageDraftSchema = z.object({
  variant_name: z.string().min(1),
  caption: z.string().min(1),
  hashtags: z.array(z.string()),
  alt_text: z.string().min(1),
  combined_text: z.string().min(1),
  style_match_notes: z.string().optional(),
  source_post_ids_used: z.array(z.string()).optional(),
  risk_flags: z.array(z.string()).optional(),
});

const draftOutputSchema = z.union([
  z.object({
    source_summary: z.string().min(1),
    drafts: z.array(textDraftSchema).length(3),
    grounding_notes: z.array(z.string()),
  }),
  z.object({
    source_summary: z.string().min(1),
    drafts: z.array(imageDraftSchema).length(3),
    grounding_notes: z.array(z.string()),
  }),
]);

const analysisOutputSchema = z.object({
  dashboard: z.record(z.string(), z.unknown()),
  email: z.object({
    subject: z.string().min(1),
    markdown: z.string().min(1),
  }),
});

const emailDigestOutputSchema = z.object({
  subject: z.string().min(1),
  markdown: z.string().min(1),
});

type RunType = (typeof TASK_RUN_TYPE)[keyof typeof TASK_RUN_TYPE];

async function withTaskRunRecord<T>(
  runType: RunType,
  input: unknown,
  task: () => Promise<T>,
): Promise<T> {
  void runType;
  void input;
  return task();
}

function buildPersonaPrompt(input: unknown) {
  return [
    "You are an expert persona builder for an X writing workspace.",
    "Build a concise persona from the provided JSON input.",
    "Return strict JSON with these keys:",
    "- persona_md: short markdown describing voice, audience, goals, tone, things to avoid, post length, approval preference",
    "- style_rules: object with concrete style and formatting rules",
    "- memory_summary: a compact summary of durable preferences (no raw examples)",
    "Input JSON:",
    JSON.stringify(input),
  ].join("\n");
}

export function runPersonaBuild(
  input: unknown,
  options?: { apiKey?: string; modelName?: string },
) {
  return withTaskRunRecord(TASK_RUN_TYPE.personaBuild, input, () =>
    generateStructured(buildPersonaPrompt(input), personaOutputSchema, options),
  );
}

function buildMemorySyncPrompt(input: unknown) {
  return [
    "You convert raw and messy writing examples into compact durable style memories.",
    "Extract voice, rhythm, phrasing, formatting habits, vocabulary, topics, and avoidances.",
    "Ignore duplicated text, boilerplate, navigation labels, timestamps, broken formatting, and unrelated paste artifacts.",
    "Do not store raw examples in memory_summary.",
    "Return strict JSON with these keys:",
    "- durable_memory_items: array of short rule-like strings",
    "- skipped_items: array of strings explaining anything skipped",
    "- memory_summary: one-paragraph compact summary of style preferences",
    "Input JSON:",
    JSON.stringify(input),
  ].join("\n");
}

export function runMemorySync(
  input: unknown,
  options?: { apiKey?: string; modelName?: string },
) {
  return withTaskRunRecord(TASK_RUN_TYPE.memorySync, input, () =>
    generateStructured(buildMemorySyncPrompt(input), memorySyncOutputSchema, options),
  );
}

export async function syncWritingExamplesToNativeMemory(
  input: unknown,
  options?: { apiKey?: string; modelName?: string },
) {
  return runMemorySync(input, options);
}

function buildPreviewPrompt(input: unknown, postType: "text" | "image") {
  const postFormat =
    postType === "image"
      ? [
          "Each draft is an image post draft with these required fields:",
          "- variant_name (e.g., 'Variant A')",
          "- caption (the textual caption alone)",
          "- hashtags (array of strings, no leading '#')",
          "- alt_text (accessibility description of the image, required)",
          "- combined_text (caption plus hashtags as a single publishable string)",
          "- style_match_notes",
          "- source_post_ids_used (optional)",
          "- risk_flags (optional)",
          `combined_text must be at most ${X_POST_MAX_CHARS} characters.`,
        ].join("\n")
      : [
          "Each draft is a text post draft with these required fields:",
          "- variant_name (e.g., 'Variant A')",
          "- draft_text (the full publishable text)",
          "- style_match_notes",
          "- source_post_ids_used (optional)",
          "- risk_flags (optional)",
          `draft_text must be at most ${X_POST_MAX_CHARS} characters.`,
        ].join("\n");

  return [
    "You are a grounded X post writer. Generate exactly 3 distinct draft variants.",
    "Honor the active persona, style rules, optional writing examples, and any memo or image context.",
    "Avoid unverified claims and unwanted rewrites.",
    postFormat,
    "Return strict JSON with keys: source_summary, drafts (array of 3), grounding_notes (array).",
    "Input JSON:",
    JSON.stringify(input),
  ].join("\n");
}

export function runPreviewGeneration(input: unknown, imageDataUrls: string[]) {
  const postType = imageDataUrls.length > 0 ? "image" : "text";
  const prompt = buildPreviewPrompt(
    {
      ...(typeof input === "object" && input ? input : { input }),
      image_count: imageDataUrls.length,
    },
    postType,
  );

  return withTaskRunRecord(TASK_RUN_TYPE.previewGeneration, input, () =>
    generateStructured(prompt, draftOutputSchema),
  );
}

export function runPreviewReprompt(input: unknown) {
  const postType =
    typeof input === "object" &&
    input !== null &&
    (input as Record<string, unknown>).post_type === "image"
      ? "image"
      : "text";
  const prompt = [
    "You refresh a set of 3 draft variants based on a user instruction.",
    "Keep what works, change what was asked.",
    "Maintain the same post type as the previous batch.",
    buildPreviewPrompt(input, postType),
  ].join("\n");

  return withTaskRunRecord(TASK_RUN_TYPE.previewReprompt, input, () =>
    generateStructured(prompt, draftOutputSchema),
  );
}

function buildEngagementPrompt(input: unknown) {
  return [
    "You analyze a real engagement payload across the user's connected channels.",
    "Summarize what is working, what is not, and any patterns across followers, impressions, likes, comments, and shares.",
    "Be concise and concrete. If a field is unavailable, note it gracefully without guessing.",
    "Return strict JSON with keys:",
    "- dashboard: object with the following fields:",
    "  - top_posts: array of { platform: string, post_id: string, summary: string }",
    "  - platform_summary: array of { platform: string, followers: number, engagement_rate: number, avg_likes: number, post_count: number, change_pct: number, summary: string }",
    "  - key_findings: array of strings",
    "  - engagement_change_pct: number (overall engagement change percentage vs previous period)",
    "- email: object with subject and markdown for a digest email",
    "Input JSON:",
    JSON.stringify(input),
  ].join("\n");
}

export function runEngagementAnalysis(
  input: unknown,
  options?: { apiKey?: string; modelName?: string },
) {
  return withTaskRunRecord(TASK_RUN_TYPE.engagementAnalysis, input, () =>
    generateStructured(buildEngagementPrompt(input), analysisOutputSchema, options),
  );
}


function buildEmailDigestPrompt(input: unknown) {
  return [
    "You generate an email digest from a dashboard insight.",
    "Return strict JSON with keys:",
    "- subject: short subject line",
    "- markdown: a digest body in markdown",
    "Input JSON:",
    JSON.stringify(input),
  ].join("\n");
}

export function runEmailDigestGeneration(input: unknown) {
  return withTaskRunRecord(TASK_RUN_TYPE.emailDigestGeneration, input, () =>
    generateStructured(buildEmailDigestPrompt(input), emailDigestOutputSchema),
  );
}
