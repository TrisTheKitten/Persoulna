# Constants Reference (`src/lib/constants.ts`)

## Status Enums
| Constant | Values |
|----------|--------|
| CONNECTION_STATUS | `connected`, `missing`, `failed` |
| TOKEN_EXPIRY_STATUS | `unknown`, `valid`, `expired` |
| PERSONA_STATUS | `generated`, `active` |
| MEMORY_SYNC_STATUS | `not_requested`, `synced`, `failed` |
| DRAFT_STATUS | `draft`, `approved`, `rejected`, `published`, `failed` |
| BATCH_STATUS | `generated` |
| APPROVAL_STATUS | `approved` |
| PUBLISH_STATUS | `published`, `failed` |
| DIGEST_STATUS | `generated` |
| EMAIL_STATUS | `sent`, `failed` |
| TASK_RUNTIME | `native` |
| TASK_STATUS | `succeeded`, `failed` |
| TASK_RUN_TYPE | `persona_build`, `memory_sync`, `preview_generation`, `preview_reprompt`, `engagement_analysis`, `email_digest_generation` |
| POST_TYPE | `text`, `image` |
| SUPPORTED_PLATFORM | `x`, `linkedin`, `linkedin-page`, `threads`, `medium`, `facebook`, `instagram`, `instagram-standalone`, `telegram` |
| PLATFORM_FORMAT | `tweet`, `thread`, `linkedin_post`, `threads_post`, `medium_article`, `social_post` |
| CONTENT_BATCH_STATUS | `parsed`, `generated`, `scheduled`, `failed` |
| PLATFORM_DRAFT_BATCH_STATUS | `generated`, `scheduled` |
| PLATFORM_DRAFT_STATUS | `draft`, `scheduled`, `posted`, `failed` |
| SCHEDULED_POST_STATUS | `pending`, `scheduled`, `posted`, `failed` |
| SCHEDULE_TYPE | `now`, `schedule` |
| `POSTIZ_ANALYTICS_SCOPE` | `post`, `platform` |
| `POSTIZ_READINESS_BLOCKERS` | `missing_postiz_api_key`, `postiz_connection_failed`, `no_postiz_integrations`, `no_supported_platform_connected` |

## Numeric Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `DEFAULT_USER_ID` | `"default-user"` | Legacy Prisma seed/runtime fallback constant; not used for hosted local-only user ownership |
| `REQUIRED_DRAFT_COUNT` | `3` | Legacy draft count |
| `RECENT_POST_LIMIT` | `3` | Legacy recent post limit |
| `X_POST_LOOKUP_LIMIT` | `10` | Legacy fetch limit |
| `BYTES_PER_MEGABYTE` | `1048576` | Byte conversion |
| `MAX_IMAGE_UPLOAD_COUNT` | `4` | Command image upload limit |
| `MAX_IMAGE_UPLOAD_BYTES` | `5242880` | Command image byte cap per file |
| `X_POST_MAX_CHARS` | `280` | Tweet/thread segment cap |
| `MAX_DRAFTS_PER_PLATFORM` | `5` | Cap per platform per command |
| `DEFAULT_SELECTED_PLATFORM_DRAFT_COUNT` | `1` | Draft count generated per selected social platform |
| `POSTIZ_HISTORY_LOOKBACK_DAYS` | `90` | Rolling Postiz post window |
| `POSTIZ_ANALYTICS_LOOKBACK_DAYS` | `90` | Postiz analytics window |

## Other Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `DEFAULT_GEMINI_MODEL_NAME` | `"gemini-2.5-flash"` | Default Gemini model |
| `POSTIZ_DEFAULT_BASE_URL` | `"https://api.postiz.com/public/v1"` | Default Postiz base URL |
| `UNAVAILABLE_STATUS` | `"unavailable"` | Used for failed legacy fields |
| `RESEND_PROVIDER` | `"resend"` | Email provider name |
| `IMAGE_MIME_TYPE_PREFIX` | `"image/"` | Server and client image MIME prefix |
| `IMAGE_UPLOAD_SERVER_ACTION_BODY_SIZE_LIMIT` | `"25mb"` | Server action body limit for up to 4 images |
| `BLOCKERS` | Object with readiness blocker keys including `missingPostizApiKey`, `postizConnectionFailed`, `noPostizIntegrations`, `noSupportedPlatformConnected` | Readiness blocker identifiers |
| `POSTIZ_READINESS_BLOCKERS` | Subset object specific to Postiz blockers | Convenience grouping |
