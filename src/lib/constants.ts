export const DEFAULT_USER_ID = "default-user";
export const REQUIRED_DRAFT_COUNT = 3;
export const RECENT_POST_LIMIT = 3;
export const X_POST_LOOKUP_LIMIT = 10;
export const BYTES_PER_MEGABYTE = 1024 * 1024;
export const MAX_IMAGE_UPLOAD_COUNT = 4;
export const MAX_IMAGE_UPLOAD_BYTES = 5 * BYTES_PER_MEGABYTE;
export const IMAGE_MIME_TYPE_PREFIX = "image/";
export const IMAGE_UPLOAD_SERVER_ACTION_BODY_SIZE_LIMIT = "25mb";
export const POST_TYPE = {
  text: "text",
  image: "image",
} as const;
export const BLOCKERS = {
  missingXConnection: "missing_x_connection",
  missingActivePersona: "missing_active_persona",
  noDraftGenerated: "no_draft_generated",
  noApprovedDraft: "no_approved_draft",
  noInsightDigest: "no_insight_digest",
  missingPostizApiKey: "missing_postiz_api_key",
  postizConnectionFailed: "postiz_connection_failed",
  noPostizIntegrations: "no_postiz_integrations",
  noSupportedPlatformConnected: "no_supported_platform_connected",
} as const;
export const CONNECTION_STATUS = {
  connected: "connected",
  missing: "missing",
  failed: "failed",
} as const;
export const TOKEN_EXPIRY_STATUS = {
  unknown: "unknown",
  valid: "valid",
  expired: "expired",
} as const;
export const PERSONA_STATUS = {
  generated: "generated",
  active: "active",
} as const;
export const MEMORY_SYNC_STATUS = {
  notRequested: "not_requested",
  synced: "synced",
  failed: "failed",
} as const;
export const DRAFT_STATUS = {
  draft: "draft",
  approved: "approved",
  rejected: "rejected",
  published: "published",
  failed: "failed",
} as const;
export const BATCH_STATUS = {
  generated: "generated",
} as const;
export const APPROVAL_STATUS = {
  approved: "approved",
} as const;
export const PUBLISH_STATUS = {
  published: "published",
  failed: "failed",
} as const;
export const DIGEST_STATUS = {
  generated: "generated",
} as const;
export const EMAIL_STATUS = {
  sent: "sent",
  failed: "failed",
} as const;
export const TASK_RUNTIME = {
  native: "native",
} as const;
export const TASK_STATUS = {
  succeeded: "succeeded",
  failed: "failed",
} as const;
export const TASK_RUN_TYPE = {
  personaBuild: "persona_build",
  memorySync: "memory_sync",
  previewGeneration: "preview_generation",
  previewReprompt: "preview_reprompt",
  engagementAnalysis: "engagement_analysis",
  emailDigestGeneration: "email_digest_generation",
} as const;
export const X_POST_MAX_CHARS = 280;
export const DEFAULT_GEMINI_MODEL_NAME = "gemini-2.5-flash";

export const POSTIZ_DEFAULT_BASE_URL = "https://api.postiz.com/public/v1";
export const POSTIZ_HISTORY_LOOKBACK_DAYS = 90;
export const POSTIZ_ANALYTICS_LOOKBACK_DAYS = 90;

export const SUPPORTED_PLATFORM = {
  x: "x",
  linkedin: "linkedin",
  linkedinPage: "linkedin-page",
  threads: "threads",
  medium: "medium",
  facebook: "facebook",
  instagram: "instagram",
  instagramStandalone: "instagram-standalone",
  telegram: "telegram",
} as const;

export const PLATFORM_FORMAT = {
  tweet: "tweet",
  thread: "thread",
  linkedinPost: "linkedin_post",
  threadsPost: "threads_post",
  mediumArticle: "medium_article",
  socialPost: "social_post",
} as const;

export const MAX_DRAFTS_PER_PLATFORM = 5;
export const DEFAULT_SELECTED_PLATFORM_DRAFT_COUNT = 1;

export const CONTENT_BATCH_STATUS = {
  parsed: "parsed",
  generated: "generated",
  scheduled: "scheduled",
  failed: "failed",
} as const;

export const PLATFORM_DRAFT_BATCH_STATUS = {
  generated: "generated",
  scheduled: "scheduled",
} as const;

export const PLATFORM_DRAFT_STATUS = {
  draft: "draft",
  scheduled: "scheduled",
  posted: "posted",
  failed: "failed",
} as const;

export const SCHEDULED_POST_STATUS = {
  pending: "pending",
  scheduled: "scheduled",
  posted: "posted",
  failed: "failed",
} as const;

export const SCHEDULE_TYPE = {
  now: "now",
  schedule: "schedule",
} as const;

export const POSTIZ_READINESS_BLOCKERS = {
  missingPostizApiKey: "missing_postiz_api_key",
  postizConnectionFailed: "postiz_connection_failed",
  noPostizIntegrations: "no_postiz_integrations",
  noSupportedPlatformConnected: "no_supported_platform_connected",
} as const;

export const POSTIZ_ANALYTICS_SCOPE = {
  post: "post",
  platform: "platform",
} as const;
export const UNAVAILABLE_STATUS = "unavailable";
export const RESEND_PROVIDER = "resend";
