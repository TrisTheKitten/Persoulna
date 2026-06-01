import { GoogleGenAI, type GenerateContentConfig, type Part } from "@google/genai";
import { z } from "zod";
import { DEFAULT_GEMINI_MODEL_NAME } from "./constants";

export const GEMINI_UNAVAILABLE_MESSAGE = "The writing agent is temporarily unavailable.";

const GEMINI_REQUEST_TIMEOUT_MS = 180000;
const STRICT_JSON_RETRY_INSTRUCTION =
  "Return only valid JSON matching the requested schema. Do not include markdown or explanation.";
const imageSummarySchema = z.object({
  summary: z.string().min(1),
});

type GenerateStructuredOptions = {
  useSearchGrounding?: boolean;
  apiKey?: string;
  modelName?: string;
};

type GeminiClient = {
  client: GoogleGenAI;
  modelName: string;
};

let cachedClient: GeminiClient | null = null;

function getGeminiClient(apiKey?: string, modelName?: string): GeminiClient {
  if (apiKey) {
    return {
      client: new GoogleGenAI({ apiKey }),
      modelName: modelName || DEFAULT_GEMINI_MODEL_NAME,
    };
  }

  if (cachedClient) {
    return cachedClient;
  }

  const envApiKey = process.env.GEMINI_API_KEY;
  if (!envApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  const envModelName = process.env.GEMINI_MODEL_NAME || DEFAULT_GEMINI_MODEL_NAME;
  cachedClient = {
    client: new GoogleGenAI({ apiKey: envApiKey }),
    modelName: envModelName,
  };
  return cachedClient;
}

function parseJsonContent<T>(content: string, schema: z.ZodType<T>) {
  return schema.parse(JSON.parse(content));
}

function buildJsonSchema(schema: z.ZodType<unknown>) {
  return z.toJSONSchema(schema, { target: "draft-7" }) as unknown;
}

function buildGenerateContentConfig(
  jsonSchema: unknown,
  options: GenerateStructuredOptions = {},
): GenerateContentConfig {
  return {
    responseMimeType: "application/json",
    responseJsonSchema: jsonSchema,
    abortSignal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
    ...(options.useSearchGrounding
      ? { tools: [{ googleSearch: {} }] }
      : {}),
  };
}

async function requestGeminiText(
  prompt: string,
  jsonSchema: unknown,
  options: GenerateStructuredOptions = {},
) {
  const { client, modelName } = getGeminiClient(options.apiKey, options.modelName);
  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: buildGenerateContentConfig(jsonSchema, options),
  });

  const text = response.text;
  if (typeof text !== "string" || text.length === 0) {
    throw new Error(GEMINI_UNAVAILABLE_MESSAGE);
  }

  return text;
}

async function requestGeminiPartsText(
  parts: Part[],
  jsonSchema: unknown,
  apiKey?: string,
  modelName?: string,
) {
  const { client, modelName: actualModelName } = getGeminiClient(apiKey, modelName);
  const response = await client.models.generateContent({
    model: actualModelName,
    contents: parts,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      abortSignal: AbortSignal.timeout(GEMINI_REQUEST_TIMEOUT_MS),
    },
  });

  const text = response.text;
  if (typeof text !== "string" || text.length === 0) {
    throw new Error(GEMINI_UNAVAILABLE_MESSAGE);
  }

  return text;
}

export async function generateStructured<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: GenerateStructuredOptions = {},
): Promise<T> {
  const jsonSchema = buildJsonSchema(schema);

  try {
    const responseText = await requestGeminiText(prompt, jsonSchema, options);
    try {
      return parseJsonContent(responseText, schema);
    } catch (error) {
      if (!(error instanceof SyntaxError) && !(error instanceof z.ZodError)) {
        throw error;
      }
      const retryPrompt = `${prompt}\n\n${STRICT_JSON_RETRY_INSTRUCTION}`;
      const retryText = await requestGeminiText(
        retryPrompt,
        jsonSchema,
        options,
      );
      return parseJsonContent(retryText, schema);
    }
  } catch (error) {
    if (error instanceof Error && error.message === GEMINI_UNAVAILABLE_MESSAGE) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new Error(GEMINI_UNAVAILABLE_MESSAGE);
    }
    if (error instanceof SyntaxError) {
      throw new Error(GEMINI_UNAVAILABLE_MESSAGE);
    }
    console.error("Gemini request failed", error);
    throw new Error(GEMINI_UNAVAILABLE_MESSAGE);
  }
}

export async function summarizeImageFile(
  file: File,
  apiKey?: string,
  modelName?: string,
): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const prompt = [
    "Describe this uploaded image for a social media content generation workflow.",
    "Be concrete and compact. Mention visible subjects, setting, text if legible, mood, and any details useful for a caption.",
    "Return strict JSON with key summary.",
    `Filename: ${file.name}`,
  ].join("\n");
  const jsonSchema = buildJsonSchema(imageSummarySchema);
  const parts: Part[] = [
    { text: prompt },
    {
      inlineData: {
        data: bytes.toString("base64"),
        mimeType: file.type,
      },
    },
  ];

  try {
    const responseText = await requestGeminiPartsText(parts, jsonSchema, apiKey, modelName);
    try {
      return parseJsonContent(responseText, imageSummarySchema).summary;
    } catch (error) {
      if (!(error instanceof SyntaxError) && !(error instanceof z.ZodError)) {
        throw error;
      }
      const retryText = await requestGeminiPartsText(
        [{ text: `${prompt}\n\n${STRICT_JSON_RETRY_INSTRUCTION}` }, parts[1]],
        jsonSchema,
        apiKey,
        modelName,
      );
      return parseJsonContent(retryText, imageSummarySchema).summary;
    }
  } catch (error) {
    if (error instanceof Error && error.message === GEMINI_UNAVAILABLE_MESSAGE) {
      throw error;
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      throw new Error(GEMINI_UNAVAILABLE_MESSAGE);
    }
    console.error("Gemini image summary failed", error);
    throw new Error(GEMINI_UNAVAILABLE_MESSAGE);
  }
}
