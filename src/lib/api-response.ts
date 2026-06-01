import { NextResponse } from "next/server";
import { GEMINI_UNAVAILABLE_MESSAGE } from "./gemini";

export async function readJsonRequest(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON request");
  }
}

export function toApiErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";

  if (message === GEMINI_UNAVAILABLE_MESSAGE) {
    return NextResponse.json({ error: message }, { status: 503 });
  }

  return NextResponse.json({ error: "Request failed" }, { status: 400 });
}
