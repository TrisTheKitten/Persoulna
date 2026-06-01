import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { checkPostizConnection } from "@/src/lib/postiz";
import { DEFAULT_GEMINI_MODEL_NAME } from "@/src/lib/constants";
import { requireAuthenticatedUser } from "@/src/lib/supabase/server";

async function testGemini(apiKey: string, modelName?: string): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    await ai.models.generateContent({
      model: modelName || DEFAULT_GEMINI_MODEL_NAME,
      contents: "Ping",
    });
    return true;
  } catch (error) {
    console.error("Gemini test failed:", error);
    return false;
  }
}

export async function POST(request: Request) {
  await requireAuthenticatedUser();
  const geminiKey = request.headers.get("x-vault-gemini-api-key") || undefined;
  const geminiModel = request.headers.get("x-vault-gemini-model-name") || undefined;
  const postizToken = request.headers.get("x-vault-postiz-token") || undefined;
  const postizUrl = request.headers.get("x-vault-postiz-url") || undefined;

  const geminiOk = geminiKey ? await testGemini(geminiKey, geminiModel) : false;

  const postizOk = postizToken
    ? await checkPostizConnection({ token: postizToken, baseUrl: postizUrl })
    : false;

  return NextResponse.json({
    gemini: geminiOk,
    postiz: postizOk,
  });
}
