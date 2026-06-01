import { NextResponse } from "next/server";
import { getDashboardData } from "@/src/lib/dashboard";

export async function GET() {
  const data = await getDashboardData();
  return NextResponse.json({
    readiness: data.readiness,
    active_persona_summary: data.active_persona_summary,
    postiz_integrations: data.postiz_integrations,
    latest_content_batch: data.latest_content_batch,
    latest_scheduled_posts: data.latest_scheduled_posts,
    latest_insight_digest: data.latest_insight_digest,
  });
}
