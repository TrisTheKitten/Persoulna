# Data Flow & Native Task Integration

## Shared Data Flow
```
page.tsx / analytics/page.tsx / settings/page.tsx / route.ts
  -> getDashboardData() [src/lib/dashboard.ts]
    -> requireAuthenticatedUser() [src/lib/supabase/server.ts]
      -> getSupabaseConfig() [src/lib/supabase/config.ts]
    -> getResolvedUserProfile() [src/lib/profile.ts]
      -> ensure `public.profiles` row; nickname from Supabase, avatar from uploaded profile URL or OAuth metadata, fallback initial from email prefix
    -> Return authenticated user, `user_profile`, and empty dashboard shell
  -> client unlocks vault
  -> loadLocalAppData() [src/lib/local-app-data.ts]
  -> decrypt IndexedDB record and merge readiness state in memory
```

## Settings Memory Pipeline
```
SettingsForm -> POST /api/vault/settings
  -> read optional `.txt` files from FormData field `writing_examples`
       max 5 files, max 1 MB each, filename must end in `.txt`, MIME must be text/plain or empty
  -> read each file with File.text()
  -> optional persona build receives uploaded writing samples as context
  -> for each uploaded file:
       syncWritingExamplesToNativeMemory() parses messy source text into durable_memory_items, skipped_items, memory_summary
       route returns updated persona and writing examples
  -> client encrypts and saves the updated local app record to IndexedDB
```

## Chat Command Pipeline
```
HomeClient -> POST /api/vault/generate
  -> read and validate images from FormData
       max 4 files, max 5 MB each, MIME starts with image/
  -> parseUserCommand(rawCommand) [src/lib/command-parser.ts]
       Gemini returns { topic, constraints, items[] } validated by Zod; items may be empty when platform choice is only from UI
  -> read selected platforms and encrypted-local integration context from formData
       selected platforms must match active linked Postiz integrations from local data
       command-parsed format/count is used when it matches the selected platform, otherwise the platform default is used
  -> upload accepted images to Postiz /upload
  -> summarize uploaded images with Gemini vision
  -> load generation context from request-scoped local persona/style data
  -> for each selected platform item:
       generatePlatformBatch(item, context) [src/lib/platform-generator.ts]
         uses platform-specific prompt profiles, `writing-skills/SKILL.md`, matching platform `writing-skills/*.md` references when available, persona, style memory, recent posts, image summaries, deterministic search-grounding gating for freshness/fact-sensitive topics, and dispatches per platform/format:
           x + tweet                -> { variant_name, content }
           x + thread               -> { variant_name, segments[] }
           linkedin + linkedin_post -> { variant_name, content }
           linkedin-page + linkedin_post -> { variant_name, content }
           threads + threads_post   -> { variant_name, content }
           medium + medium_article  -> { variant_name, title, subtitle, tags, content_markdown }
           linked channels + social_post -> { variant_name, content }
  -> route returns a content batch object with generated drafts
  -> client encrypts and saves the content batch to IndexedDB
```

## Schedule Pipeline
```
DraftsCarousel -> POST /api/vault/schedule
  -> validate scheduleType ("now" | "schedule") and scheduledAt
  -> receive local content batch and integration snapshots from the client
  -> validate scheduleType ("now" | "schedule") and scheduledAt
  -> find matching local integration snapshot by platform identifier
       per draft:
         validate per-platform shape (length, segments, Medium fields)
         build PostizCreatePostBody with type, ISO date, and eligible media assets
         createPostizPost(body)
         return updated draft status and scheduledPost data
  -> client encrypts and saves the updated content batch to IndexedDB
```

`src/lib/postiz.ts` validates request-scoped and environment Postiz base URLs before outbound calls. Production URLs must be HTTPS, local development can use `http://localhost`, `http://127.0.0.1`, or `http://[::1]`, and embedded URL credentials are rejected.

Postiz settings per platform:
- X: `{ __type: "x", who_can_reply_post: "everyone" }`. Threads use multiple `value` items (one per segment).
- LinkedIn: `{ __type: "linkedin" }` or `{ __type: "linkedin-page" }`.
- Threads: `{ __type: "threads" }`.
- Medium: `{ __type: "medium", title, subtitle, tags: [{ value, label }] }`. `value` is `[{ content: content_markdown, image: [] }]`.
- Non-Medium platforms attach uploaded Postiz assets as `image: [{ id, path }]`. For X threads, images are attached to the first segment only.
- Facebook, Telegram, and platforms without custom settings use `{ __type: platform }`.
- Instagram and Instagram Standalone use `{ __type: platform, post_type: "post", collaborators: [] }`.
- Instagram generation uses `writing-skills/instagram.md` to keep captions visual-first, no more than 3 short sentences, with 1-2 relevant emojis total.

## Analytics Pipeline
```
AnalyticsClient -> POST /api/vault/refresh-analytics
  -> listPostizIntegrations with request-scoped token
  -> fetch platform analytics and last 90 days of posts
  -> runEngagementAnalysis(aggregate) [native task]
  -> route returns insight digest
  -> client encrypts and saves the digest to IndexedDB
```

## Native Gemini Runtime
- `src/lib/gemini.ts` exposes `generateStructured(prompt, zodSchema, options?)` and `summarizeImageFile(file)`. Prompts, image parts, and Zod-derived JSON Schemas are sent through `responseJsonSchema` with `responseMimeType: "application/json"`. Zod or JSON parse failures retry once with a stricter instruction.
- `generateStructured` can enable Gemini Google Search grounding through `useSearchGrounding`; `src/lib/platform-generator.ts` is the only current caller that opts in, using deterministic topic/constraint patterns for current, recent, market, regulatory, product, comparison, event, and explicit research/source requests. Command parsing, persona/memory tasks, analytics summaries, email digests, and image summaries stay ungrounded.
- Uploaded image bytes are sent only to Gemini vision and Postiz upload. Stored records keep filename, MIME type, byte size, Postiz media id/path, and AI summary.
- All native tasks are wrapped in `TaskRunRecord` with `runtime: "native"`.
- `src/lib/command-parser.ts` writes `runType: "command_parse"`.
- `src/lib/platform-generator.ts` writes `runType: "platform_draft_generation:<platform>:<format>"`.
- `src/lib/native-tasks.ts` writes one of `persona_build`, `memory_sync`, `preview_generation`, `preview_reprompt`, `engagement_analysis`, `email_digest_generation` for backwards-compat helpers. `memory_sync` treats uploaded writing examples as messy source text and extracts compact style memories while ignoring boilerplate and paste artifacts.

## Encrypted Credential Vault
- **Client-Side Cryptography (`src/lib/vault.ts`)**: Uses Web Crypto APIs to encrypt API keys in-browser. Derives a 256-bit AES-GCM key from a user passphrase and a random 16-byte salt via PBKDF2 (100,000 iterations, SHA-256). Encrypts credential payloads with AES-GCM using a random 12-byte IV. The salt, IV, and ciphertext are base64-encoded and persisted in browser `localStorage` as `persoulna_vault`.
- **Vault State Management (`src/context/VaultContext.tsx`)**: Integrates the vault into the React tree, providing state hooks for vault status (`isConnected`), passphrase, and raw decrypted credentials. Successful unlocks and saves keep the passphrase in same-tab `sessionStorage` as `persoulna_vault_session_passphrase`, allowing route changes and reloads to restore the unlocked vault until the user locks, resets, or closes the tab session.
- **Request Interception & Header Flow**: When a vault is configured and unlocked, the client intercepts operations (chat command submission, settings edits, scheduling, sync, analytics refresh) and routes them to proxy endpoints `/api/vault/*` instead of invoking server actions directly. Decrypted keys are injected into headers:
  - `x-vault-gemini-api-key`
  - `x-vault-gemini-model-name`
  - `x-vault-postiz-token`
  - `x-vault-postiz-url`
- **Postiz Token Selection**: Saved Postiz Public API keys take precedence over stored OAuth access tokens. Postiz tokens are sent directly in the `Authorization` header, matching the Public API format.
- **Request-Scoped Propagation**: The server proxy endpoints extract these keys, bypassing environment variables (`process.env`), and supply them as runtime parameters directly to the underlying library integrations (`src/lib/gemini.ts` and `src/lib/postiz.ts`). Keys remain strictly in-memory for the duration of the request.

## Styling System
- Light, warm minimalist palette with deep teal accent
- Calm tokens, no gradients, no purple/blue brights, no emoji
- Responsive: page grids collapse below 980px
