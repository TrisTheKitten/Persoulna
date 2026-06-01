# Persistence Model

## Runtime Persistence

The hosted app uses Supabase Auth for identity. Public display fields (nickname, avatar URL) are stored in Supabase `public.profiles`. Uploaded avatar image files are stored in the public Supabase Storage `avatars` bucket, with the public URL saved to `profiles.avatar_url`. Other app-specific user data is not written to additional Supabase tables or the local Prisma database.

Private app data is stored in browser IndexedDB as one encrypted record per Supabase Auth user id:

- active persona summary
- writing examples and AI memory summaries
- synced Postiz integration snapshots
- latest generated content batch and drafts
- scheduled post results
- latest analytics insight digest

Encryption is browser-side AES-GCM through `src/lib/vault.ts`. The vault passphrase is required to decrypt the IndexedDB record. Decrypted values stay in React state while the vault is unlocked.

## Supabase `profiles`

Table: `public.profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | References `auth.users(id)`, cascade delete |
| `nickname` | `text` nullable | User-chosen greeting name from Settings |
| `avatar_url` | `text` nullable | OAuth avatar URL synced on sign-in when empty, or uploaded avatar public URL from Settings |
| `updated_at` | `timestamptz` | Auto-updated on profile changes |

RLS: users can `select`, `insert`, and `update` only their own row (`auth.uid() = id`).

An email/password user without an avatar URL renders an app fallback using the first character of the email prefix. A trigger on `auth.users` insert creates a profile row with the OAuth picture when available.

Migration: `supabase/migrations/20260523120000_user_profiles.sql`

## Supabase Storage `avatars`

Bucket: `avatars`

- Public bucket for profile pictures
- Max file size: 2 MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- Object paths are stored under the authenticated user's id folder
- Storage RLS allows public reads and restricts insert/update/delete to the owner folder

Migration: `supabase/migrations/20260523123000_profile_avatar_storage.sql`

## Supabase Auth

Supabase Auth stores authentication records in Supabase-managed auth tables.

The app uses:

- `src/lib/supabase/client.ts` for browser auth client creation
- `src/lib/supabase/server.ts` for server auth checks
- `src/lib/supabase/middleware.ts` and `proxy.ts` for cookie refresh and protected routes; redirects preserve refreshed Supabase cookies from middleware.

## Legacy Prisma Schema

`prisma/schema.prisma` is retained as a historical/local reference for the previous SQLite data model and optional local experiments. Runtime user workflows should not depend on Prisma writes.

`src/lib/user.ts` blocks legacy server-action persistence and tells the user to unlock the browser vault.

## IndexedDB Record Shape

`src/lib/local-app-data.ts` defines `LocalAppData`:

- `schemaVersion`
- `active_persona_summary`
- `writing_examples`
- `postiz_integrations`
- `latest_content_batch`
- `latest_scheduled_posts`
- `latest_insight_digest`
- `latest_email_send_status`
- `updatedAt`

Object ids are generated client/server-side with `crypto.randomUUID()` before the encrypted local record is saved.
