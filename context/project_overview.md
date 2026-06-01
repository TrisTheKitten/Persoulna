# Persoulna - Project Overview

## Description
Persoulna is a chat-driven multi-platform content command center for one user. The user types a command (for example `write me 3 tweets about [topic], 1 linkedin post, 1 medium article, and 1 threads post`), optionally attaches images, then the backend parses the command, generates per-platform drafts in the user's voice, and the user reviews, edits, and either Posts Now or schedules. Posting and analytics flow through Postiz; creative and analysis tasks run on a native Gemini runtime.

## Tech Stack
- **Frontend & Server:** Next.js 16 (App Router, TypeScript 6)
- **Auth:** Supabase Auth with `@supabase/ssr`, email/password, and Google OAuth
- **Supabase config:** `src/lib/supabase/config.ts` validates auth env vars and normalizes accidental `/rest/v1` URL suffixes to the project root.
- **Persistence:** Browser IndexedDB encrypted with the local vault; Prisma schema is legacy/local-reference only
- **AI Integration:** `@google/genai` Gemini SDK with Zod-backed `responseJsonSchema` structured outputs and gated Google Search grounding for fact-sensitive content generation
- **Publishing & Analytics:** Postiz Public API (`https://api.postiz.com/public/v1`)
- **Email:** Resend
- **Validation:** Zod v4
- **Deployment security:** `next.config.ts` applies baseline security headers globally; Postiz URLs are validated before server-side outbound requests.

## Key Architecture
- **Public landing:** `/` with inline sign in / sign up (Supabase email/password and Google OAuth); `/login` redirects to `/`
- **App pages:** `/write` chat command + draft review, `/analytics` Postiz insights, `/settings` persona, style memory, Postiz channels
- **Client components:** `Header.tsx` (hamburger navigation), `UserAvatar.tsx` (Google/uploaded avatar or email-initial fallback), `ImagePicker.tsx` (image upload), `LoadingButton.tsx` (server-action pending buttons), `DraftsCarousel.tsx` (draft review with swipe/edit/schedule), `CustomDateTimePicker.tsx` (calendar/time picker), `MarkdownRenderer.tsx` (markdown copy), `SettingsForm.tsx` (settings form)
- **Server Actions** for all mutations
- **Encrypted local app data** stores persona, writing examples, content batches, platform drafts, scheduled posts, Postiz integration snapshots, and insight digests in browser IndexedDB. Supabase stores Auth records plus public profile display fields.
- **Native Gemini runtime:**
  - `src/lib/command-parser.ts` parses chat command into a strict JSON plan
  - `src/lib/platform-generator.ts` generates per-platform drafts via Zod-schemed Gemini calls and enables Google Search grounding only when deterministic topic/constraint patterns indicate missing external facts
  - `src/lib/gemini.ts` summarizes uploaded images with Gemini vision before draft generation
  - `src/lib/native-tasks.ts` provides persona build, memory sync, engagement analysis, and email digest helpers
- **Postiz adapter:** `src/lib/postiz.ts` covers `/is-connected`, `/integrations`, `/upload`, `/posts`, `/analytics/post/{postId}`, `/analytics/{integration}`
- **Postiz URL handling:** Request-scoped Postiz base URLs must be HTTPS, except local `http` hosts during development, and cannot include embedded credentials.
- **Scheduler:** `src/lib/postiz-scheduler.ts` builds Postiz payloads from the selected platform identifier, with custom defaults for X, Medium, and Instagram, and persists `ScheduledPost` records
- **Analytics:** manual vault-backed analytics refresh is supported; personalized hosted cron is not supported because credentials and persona data stay local-only
- **Linked platform identifiers:** The Write selector renders active synced Postiz channels. Explicit generation profiles exist for X (`x`), LinkedIn (`linkedin`), LinkedIn Page (`linkedin-page`), Threads (`threads`), Medium (`medium`), Facebook (`facebook`), Instagram (`instagram`, `instagram-standalone`), and Telegram (`telegram`); other linked Postiz identifiers fall back to a generic social post profile.

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL` (deployed app origin for Supabase OAuth and email confirmation redirects)
- `GEMINI_MODEL_NAME` (optional default model name; user Gemini keys live in the browser vault)
- `POSTIZ_BASE_URL` (optional default URL; user Postiz tokens live in the browser vault)
- `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI` (legacy; only used by the X OAuth routes that are not part of the main workflow)

## Project Structure
```
├── app/
│   ├── actions.ts
│   ├── CustomDateTimePicker.tsx  # Client date/time scheduler
│   ├── DraftsCarousel.tsx        # Client draft review carousel
│   ├── globals.css
│   ├── Header.tsx                # Client header with hamburger nav
│   ├── ImagePicker.tsx           # Client image picker
│   ├── LoadingButton.tsx         # Client pending submit button + loader mark
│   ├── LoadingSkeleton.tsx       # Route-level skeleton loading layouts
│   ├── loading.tsx               # Write route skeleton
│   ├── layout.tsx
│   ├── MarkdownRenderer.tsx      # Client markdown renderer
│   ├── page.tsx                  # Public landing page
│   ├── LandingPage.tsx           # Client landing + workflow walkthrough
│   ├── LandingAuthSection.tsx    # Embedded Supabase sign in / sign up on landing
│   ├── login/
│   │   ├── page.tsx              # Supabase sign in / sign up
│   │   └── LoginAuth.tsx         # Tabbed auth form
│   ├── write/
│   │   └── page.tsx              # Chat command + draft review
│   ├── analytics/
│   │   ├── loading.tsx           # Analytics route skeleton
│   │   └── page.tsx              # Postiz-backed insights
│   ├── settings/
│   │   ├── loading.tsx           # Settings route skeleton
│   │   ├── SettingsForm.tsx      # Client settings form
│   │   └── page.tsx              # Persona, style memory, Postiz channels
│   └── api/
│       ├── cron/daily-analytics/
│       ├── dashboard/
│       ├── vault/                # Webserver proxy routes for local vault workflows
│       └── x/                    # Legacy X OAuth
├── src/lib/
│   ├── api-response.ts
│   ├── command-parser.ts
│   ├── constants.ts
│   ├── dashboard.ts
│   ├── db.ts
│   ├── gemini.ts
│   ├── native-tasks.ts
│   ├── platform-generator.ts
│   ├── postiz.ts
│   ├── postiz-analytics.ts
│   ├── postiz-scheduler.ts
│   ├── readiness.ts
│   ├── resend.ts
│   ├── supabase/
│   ├── user.ts
│   └── x.ts                      # legacy
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── context/
```

## Core Workflow
1. **Auth + vault** -> Sign in with Supabase Auth through email/password or Google OAuth, unlock the browser vault, and decrypt the local IndexedDB app record
2. **Settings** -> Save persona, upload `.txt` writing examples for AI-parsed style memories, and sync Postiz integrations into encrypted local storage
2. **Command** -> Select from the user's active synced Postiz channels, type a chat command, and optionally attach up to 4 images, 5 MB each. `parseUserCommand()` extracts topic, constraints, and any requested per-platform format/count; selected channels must be linked to the user.
3. **Generate** -> Client sends decrypted request-scoped persona/style/API material to `/api/vault/generate`; the route returns a generated content batch, and the client encrypts it into IndexedDB
4. **Review and edit** -> User edits per-draft content locally; thread drafts use blank-line-separated segments
5. **Schedule** -> Client sends decrypted request-scoped Postiz token plus local draft data to `/api/vault/schedule`; the route returns Postiz results, and the client encrypts them into IndexedDB
6. **Analytics** -> Manual refresh sends decrypted request-scoped keys to `/api/vault/refresh-analytics`; the route returns an insight digest, and the client encrypts it into IndexedDB
