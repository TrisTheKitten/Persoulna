import { getResolvedUserProfile } from "./profile";
import { requireAuthenticatedUser } from "./supabase/server";

export async function getDashboardData(): Promise<any> {
  const authUser = await requireAuthenticatedUser();
  const userProfile = await getResolvedUserProfile(authUser);

  return {
    readiness: {
      blockers: [
        "missing_active_persona",
        "no_postiz_integrations",
        "no_supported_platform_connected",
        "no_draft_generated",
        "no_insight_digest",
      ],
      can_generate_drafts: false,
      can_schedule: false,
      can_analyze: false,
    },
    user: {
      id: authUser.id,
      email: authUser.email ?? null,
    },
    user_profile: userProfile,
    active_persona_summary: null,
    postiz_integrations: [],
    latest_content_batch: null,
    latest_scheduled_posts: [],
    latest_insight_digest: null,
    latest_email_send_status: null,
  };
}
