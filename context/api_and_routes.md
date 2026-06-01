# API Routes & Server Actions

## Pages

### `/` - `app/page.tsx` + `app/LandingPage.tsx` + `app/LandingAuthSection.tsx`
- Public marketing landing (unauthenticated only); authenticated users redirect to `/write`
- Inline Supabase email/password and Google OAuth sign in / sign up in the hero; server actions in `app/login/actions.ts`
- Query: `?auth=signin|signup`, `?next=`, `?error=`
- Auth destinations are constrained to same-origin relative paths.

### `/login` - `app/login/page.tsx`
- Redirects to `/` with the same query params (`auth`, `next`, `error`)

### `/auth/callback` - `app/auth/callback/route.ts`
- Exchanges Supabase OAuth auth codes for a session, ensures a `public.profiles` row exists for the user, and redirects to a sanitized relative `next` path.

### `/auth/sign-out` - `app/auth/sign-out/route.ts`
- POST endpoint used by the header sign-out form. Sign-out is not exposed as a GET link to avoid route prefetch ending the session.

### `/write` - `app/write/page.tsx`
- Server-rendered chat-driven workspace with `force-dynamic`
- Calls `getDashboardData()`
- Renders the chat command form, active linked Postiz channel selector, image picker, the latest content batch grouped by platform, per-draft edit forms, Post All/Schedule All controls, and per-platform Post Now/Schedule controls
- While the vault is locked or missing, the client shows a vault notice instead of local-data blockers such as `missing_active_persona`

### `/analytics` - `app/analytics/page.tsx`
- Server-rendered analytics page with `force-dynamic`
- Renders the latest insight digest, platform summaries, top posts, and key findings derived from real Postiz analytics
- `Refresh Analytics` triggers `refreshAnalyticsAction`

### `/settings` - `app/settings/page.tsx`
- Server-rendered settings page with `force-dynamic`
- Profile card: OAuth avatar, nickname field saved to Supabase `profiles` via `saveUserProfileAction`
- Saves persona and `.txt` writing examples via the vault settings route
- `Sync Integrations` triggers `syncPostizIntegrationsAction` and lists Postiz channels
- Persona and reference controls render only after the vault is readable (`connected` or `failed`) because those values live in encrypted IndexedDB

## API Routes

### `/api/dashboard` - `app/api/dashboard/route.ts`
- GET endpoint returning the authenticated Supabase user plus an empty dashboard shell. Browser components hydrate private app data from encrypted IndexedDB after the vault unlocks.

### `/api/cron/daily-analytics` - `app/api/cron/daily-analytics/route.ts`
- Legacy endpoint retained, but personalized hosted cron is not supported in the local-only persistence model because Gemini/Postiz credentials and persona data are not stored server-side.

### Vault Interception Routes (`app/api/vault/`)
The following endpoints run on the server but receive client-decrypted keys inside request headers (`x-vault-gemini-api-key`, `x-vault-gemini-model-name`, `x-vault-postiz-token`, `x-vault-postiz-url`) to run tasks:
- **`POST /api/vault/generate`** (`app/api/vault/generate/route.ts`): Receives decrypted request-scoped keys plus local persona/style/integration context, handles image upload and Gemini generation, and returns a content batch without server persistence.
- **`POST /api/vault/schedule`** (`app/api/vault/schedule/route.ts`): Receives decrypted request-scoped Postiz token plus local draft data, posts/schedules through Postiz, and returns updated local batch data.
- **`POST /api/vault/settings`** (`app/api/vault/settings/route.ts`): Receives local persona/example state, triggers persona compilation and memory syncing, and returns updated persona and writing examples.
- **`POST /api/vault/sync`** (`app/api/vault/sync/route.ts`): Lists Postiz integrations and returns snapshots for encrypted local storage.
- **`POST /api/vault/refresh-analytics`** (`app/api/vault/refresh-analytics/route.ts`): Fetches Postiz analytics, runs Gemini insight generation, and returns a digest for encrypted local storage.
- **`POST /api/vault/test`** (`app/api/vault/test/route.ts`): Validates provided credentials against external Gemini and Postiz APIs.

### Postiz OAuth Routes (`app/api/postiz/`)
- **`GET /api/postiz/oauth/start`** (`app/api/postiz/oauth/start/route.ts`): Validates the Postiz frontend URL, generates state verification cookie, and redirects to Postiz OAuth authorization URL.
- **`GET /api/postiz/oauth/callback`** (`app/api/postiz/oauth/callback/route.ts`): Validates OAuth state and saves authorization code in a session cookie.
- **`POST /api/postiz/oauth/exchange`** (`app/api/postiz/oauth/exchange/route.ts`): Validates the Postiz backend URL and exchanges authorization code for a Postiz user access token.
- **`POST /api/postiz/social/connect`** (`app/api/postiz/social/connect/route.ts`): Validates the Postiz base URL and integration identifier, then proxies connection requests to external provider auth endpoints with credentials.

### Legacy X OAuth (kept, not used by main workflow)
- `GET /api/x/connect`, `GET /api/x/callback`, `POST /api/x/disconnect`

## Server Actions (`app/actions.ts`)

Primary user workflows should use `/api/vault/*` routes. Legacy server actions remain in `app/actions.ts`, but `ensureRuntimeSetup()` blocks server-side app persistence.

## Auth Actions (`app/login/actions.ts`)
- `signInAction` and `signUpAction` handle Supabase email/password auth.
- `signUpAction` sends Supabase `emailRedirectTo` through `/auth/callback` using the production app origin.
- `googleOAuthAction` starts Supabase Google OAuth and redirects through `/auth/callback` using the production app origin.
- `next` redirect targets must be same-origin relative paths; otherwise the user lands on `/write`.

## Profile Actions (`app/profile/actions.ts`)
- `saveUserProfileAction` upserts the authenticated user's `profiles.nickname`, optionally uploads a JPG/PNG/WebP avatar to Supabase Storage, saves the resulting public URL to `profiles.avatar_url`, and revalidates `/write`, `/settings`, and `/analytics`.

## Postiz adapter (`src/lib/postiz.ts`)
| Function | Endpoint |
|----------|----------|
| `checkPostizConnection()` | `GET /is-connected` |
| `listPostizIntegrations()` | `GET /integrations` |
| `listPostizPosts(start, end)` | `GET /posts?startDate&endDate` |
| `uploadPostizFile(file)` | `POST /upload` |
| `createPostizPost(body)` | `POST /posts` |
| `getPostizPostAnalytics(postId, days)` | `GET /analytics/post/{postId}?date=` |
| `getPostizPlatformAnalytics(integrationId, days)` | `GET /analytics/{integration}?date=` |

`createPostizPost()` accepts `type` `now`, `schedule`, or `draft`, with platform-specific `settings.__type` per-platform.

## Postiz scheduler (`src/lib/postiz-scheduler.ts`)
- `schedulePlatformBatch({ userId, platformBatchId, scheduleType, scheduledAt })`
- Validates per-platform constraints: tweet length, thread minimum segments, Medium title/subtitle/markdown body
- Maps platform identifier to `settings.__type`; X, Medium, and Instagram receive required custom defaults
- Loads `ContentBatchMedia` and attaches Postiz `image: [{ id, path }]` assets to X, LinkedIn, LinkedIn Page, and Threads values
- Keeps Medium `image: []`; Medium receives image summaries during generation only
- Calls Postiz once per draft, persists every returned `postId` and integration ID
- On Postiz failure, persists a `ScheduledPost` with `failed` status and surfaces the error

## Postiz analytics (`src/lib/postiz-analytics.ts`)
- `syncPostizIntegrations(userId)` replaces stored snapshots
- `fetchPostizPostHistory(days)` lists posts in the rolling window
- `snapshotPostAnalytics(userId, postIds, days)` and `snapshotPlatformAnalytics(userId, integrationIds, days)` persist raw analytics
- `buildAnalyticsAggregate(userId, days)` returns a typed object the AI summarizer consumes

## Key Readiness Blockers
Computed by `computeReadiness()` in `src/lib/readiness.ts`:
- `missing_postiz_api_key`
- `postiz_connection_failed`
- `no_postiz_integrations`
- `no_supported_platform_connected`
- `missing_active_persona`
- `no_draft_generated`
- `no_insight_digest`

UI gates:
- `can_generate_drafts` requires active persona + an active synced Postiz channel
- `can_schedule` requires Postiz API key + connection ok + an active synced Postiz channel
- `can_analyze` requires Postiz API key + connection ok + at least one Postiz integration
