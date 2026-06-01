import { NextResponse } from "next/server";
import { runPersonaBuild, syncWritingExamplesToNativeMemory } from "@/src/lib/native-tasks";
import { requireAuthenticatedUser } from "@/src/lib/supabase/server";
import { MEMORY_SYNC_STATUS, PERSONA_STATUS } from "@/src/lib/constants";

const TEXT_REFERENCE_FILE_EXTENSION = ".txt";
const TEXT_REFERENCE_MIME_TYPES = new Set(["", "text/plain"]);
const MAX_WRITING_EXAMPLE_FILES = 5;
const MAX_WRITING_EXAMPLE_BYTES = 1_000_000;

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getWritingExampleFiles(formData: FormData) {
  return formData
    .getAll("writing_examples")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function validateWritingExampleFiles(files: File[]) {
  if (files.length > MAX_WRITING_EXAMPLE_FILES) {
    throw new Error(`Upload up to ${MAX_WRITING_EXAMPLE_FILES} text files.`);
  }
  if (files.find((file) => file.size > MAX_WRITING_EXAMPLE_BYTES)) {
    throw new Error("Each text file must be 1 MB or less.");
  }
  if (
    files.find((file) => {
      const fileName = file.name.toLowerCase();
      return (
        !fileName.endsWith(TEXT_REFERENCE_FILE_EXTENSION) ||
        !TEXT_REFERENCE_MIME_TYPES.has(file.type)
      );
    })
  ) {
    throw new Error("Only .txt files are supported.");
  }
}

async function prepareWritingExampleFiles(files: File[]) {
  const prepared = [];
  for (const file of files) {
    const rawText = (await file.text()).trim();
    if (!rawText) {
      throw new Error("Text files cannot be empty.");
    }
    prepared.push({
      fileName: file.name,
      mimeType: file.type || "text/plain",
      byteSize: file.size,
      rawText,
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

    const formData = await request.formData();
    const personaText = getOptionalString(formData, "persona");
    const uploadedFiles = getWritingExampleFiles(formData);
    validateWritingExampleFiles(uploadedFiles);
    const writingExampleFiles = await prepareWritingExampleFiles(uploadedFiles);
    const currentPersona = JSON.parse(getOptionalString(formData, "current_persona_json") ?? "null");
    const currentWritingExamples = JSON.parse(
      getOptionalString(formData, "current_writing_examples_json") ?? "[]",
    );

    const writingSamples = writingExampleFiles
      .map((file) => [`File: ${file.fileName}`, file.rawText].join("\n"))
      .join("\n\n");

    let activePersona = currentPersona;
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
      }, geminiOptions);

      activePersona = {
        id: crypto.randomUUID(),
        version: (currentPersona?.version ?? 0) + 1,
        display_name: "Persoulna",
        status: PERSONA_STATUS.active,
        main_topics: personaText,
        persona_md: personaOutput.persona_md,
        style_rules: personaOutput.style_rules,
        memory_summary: personaOutput.memory_summary,
      };
    }

    const writingExamples = [...currentWritingExamples];
    for (const file of writingExampleFiles) {
      const example = {
        id: crypto.randomUUID(),
        rawText: file.rawText,
        sourceFileName: file.fileName,
        sourceMimeType: file.mimeType,
        sourceByteSize: file.byteSize,
        memorySyncStatus: MEMORY_SYNC_STATUS.synced,
        durableMemoryItems: [],
        skippedItems: [],
        memorySummary: null as string | null,
        createdAt: new Date().toISOString(),
      };
      const memory = await syncWritingExamplesToNativeMemory({
        active_persona_md: activePersona?.persona_md ?? null,
        style_rules: null,
        writing_examples: [{ raw_text: file.rawText }],
      }, geminiOptions);
      writingExamples.unshift({
        ...example,
        durableMemoryItems: memory.durable_memory_items,
        skippedItems: memory.skipped_items,
        memorySummary: memory.memory_summary,
      });
    }

    return NextResponse.json({
      activePersona,
      writingExamples,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
