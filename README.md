# Persoulna

Persoulna is a chat-driven content command center for one user. Type a request like `write me 3 tweets about [topic], 1 linkedin post, 1 medium article, and 1 threads post`, review and edit the per-platform drafts, then either Post Now or schedule a time. Posting and analytics flow through Postiz; creative tasks run on a native Gemini runtime.

## Key Features

- Chat command parser turns requests into per-platform batches (X, LinkedIn, Threads, Medium)
- Image uploads on content commands, capped at 4 images and 5 MB each
- Per-platform draft editor with platform-specific shapes (tweet, thread, post, Medium article)
- Postiz adapter uploads media to `/upload` and sends approved batches to Postiz with `type: "now"` or `type: "schedule"`
- Manual analytics syncs Postiz integrations, fetches the last 90 days of posts, summarizes via Gemini, and stores the digest locally
- Native Gemini runtime via `@google/genai` with Zod-backed structured outputs, vision summaries for uploaded images, and gated Google Search grounding for fact-sensitive content generation

## Tech Stack

- Next.js App Router and TypeScript
- Supabase Auth with email/password and Google OAuth
- Encrypted browser IndexedDB for app data
- Postiz Public API for publishing and analytics
- `@google/genai` Gemini SDK with Zod schemas
- Resend for email delivery
- Vanilla CSS

## Key Project Structure

```text
├── app/
│   ├── actions.ts
│   ├── CustomDateTimePicker.tsx  # Client date/time scheduler
│   ├── DraftsCarousel.tsx        # Client draft review carousel with editing
│   ├── globals.css
│   ├── Header.tsx                # Client header with hamburger navigation
│   ├── ImagePicker.tsx           # Client image picker validation
│   ├── layout.tsx
│   ├── MarkdownRenderer.tsx      # Client markdown renderer with copy
│   ├── page.tsx                  # Chat command and draft review
│   ├── analytics/page.tsx        # Postiz-backed insights
│   ├── settings/
│   │   ├── SettingsForm.tsx      # Client settings form
│   │   └── page.tsx              # Persona, style memory, Postiz channels
│   └── api/
│       ├── cron/daily-analytics/  # Legacy cron route; personalized hosted cron is disabled by local-only data
│       └── dashboard/             # Active dashboard JSON endpoint
├── src/lib/
│   ├── api-response.ts
│   ├── command-parser.ts         # Parses chat command into platform plan
│   ├── constants.ts
│   ├── dashboard.ts
│   ├── db.ts
│   ├── gemini.ts                 # Gemini adapter (Zod -> JSON Schema, optional search grounding)
│   ├── native-tasks.ts           # Native task runtime (persona, memory, analysis)
│   ├── platform-generator.ts     # Per-platform draft generation
│   ├── postiz.ts                 # Postiz API adapter
│   ├── postiz-analytics.ts       # Sync integrations, posts, analytics
│   ├── postiz-scheduler.ts       # Build per-platform Postiz payload
│   ├── readiness.ts
│   ├── resend.ts
│   └── user.ts
├── prisma/
│   ├── schema.prisma             # Prisma data model
│   └── seed.ts                   # Local seed data
├── writing-skills/
│   ├── SKILL.md                  # Shared platform writing guidance
│   ├── facebook.md
│   ├── instagram.md
│   ├── telegram.md
│   ├── threads.md
│   └── x.md
├── public/                       # Static assets and app images
├── context/                      # Agent-readable project documentation
├── prisma.config.ts
├── next.config.ts
└── package.json
```

## Environment Configuration

```text
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
NEXT_PUBLIC_APP_URL="https://your-vercel-domain.vercel.app"

GEMINI_MODEL_NAME="gemini-2.5-flash"
```

Google OAuth is configured in Supabase Auth. Enable the Google provider in the Supabase dashboard, add the Google client ID and secret there, set the Supabase Auth Site URL to your deployed app URL, and allow `/auth/callback` as an auth redirect URL for each deployed site URL. On Vercel, set `NEXT_PUBLIC_APP_URL` to the production deployment origin so OAuth and email confirmation links never fall back to localhost.

Apply the Supabase migrations in order before using profile settings:

- `supabase/migrations/20260523120000_user_profiles.sql` creates `public.profiles` with RLS for nickname and avatar URL.
- `supabase/migrations/20260523123000_profile_avatar_storage.sql` creates the public `avatars` storage bucket and owner-scoped upload policies.

## Encrypted Credential Vault & Postiz integration

For decentralized and secure API key management:
- **Client-Side Encryption**: A passphrase-protected browser vault encrypts your Gemini API Key, Gemini Model Name, Postiz API Key (Token), and Postiz URL in the browser using 256-bit AES-GCM (via Web Crypto). The encrypted bundle is stored in `localStorage` as `vault_payload`.
- **Decrypted Headers**: When the vault is unlocked, all operations (chat commands, settings updates, publishing, and analytics) bypass default server actions and route through `/api/vault/*` proxy endpoints. The decrypted keys are sent strictly via request-scoped headers (`x-vault-*`), keeping keys out of persistent server storage.
- **Postiz Cloud vs OAuth**: For Postiz Cloud, you only need to enter your Public API Key (Token) in the Settings page. You do not need to configure Client ID, Client Secret, or run the OAuth flow. Channels can be managed directly on Postiz Cloud and synced dynamically in one click. Custom OAuth setups are optional and only needed for self-hosted instances or advanced client authentication.

## Analytics

Personalized analytics are manual in the local-only model. The browser sends request-scoped Gemini/Postiz credentials to `/api/vault/refresh-analytics`, receives a digest, then encrypts it into IndexedDB. Vercel cron cannot run personalized analytics because credentials and persona data are not stored server-side.

## Image uploads

The Write form accepts up to 4 image files, 5 MB each. Server validation is authoritative. Accepted images are uploaded to Postiz before draft generation, summarized with Gemini vision, stored as `ContentBatchMedia`, and passed as Postiz `image` attachments for X, LinkedIn, LinkedIn Page, and Threads. Medium receives the image summaries for writing context but no image attachment by default.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npm run build
```
