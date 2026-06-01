# Project Spec

## Runtime Direction
Persoulna uses a pure webserver approach. The app routes user workflows through Next.js API endpoints and server modules, with browser-vault credentials supplied per request.

## Core Requirements
- Native Gemini handles command parsing, persona building, style memory extraction, draft generation, image summaries, analytics summaries, and email digest content.
- Postiz handles social channel discovery, media upload, posting, scheduling, and analytics retrieval.
- Supabase handles authentication only.
- Encrypted IndexedDB stores private app data and credential vault state in the browser.
- Server routes must not persist user API keys, Postiz tokens, persona data, drafts, or analytics snapshots.

## Main Flow
1. User signs in with Supabase Auth.
2. User unlocks the browser vault.
3. Settings, generation, scheduling, sync, analytics, and credential tests call `/api/vault/*` endpoints.
4. The server receives request-scoped credentials in headers and passes them directly to Gemini or Postiz adapters.
5. The server returns generated or fetched data to the browser.
6. The browser encrypts and saves private app data in IndexedDB.

## API Surface
- `POST /api/vault/settings`
- `POST /api/vault/generate`
- `POST /api/vault/schedule`
- `POST /api/vault/sync`
- `POST /api/vault/refresh-analytics`
- `POST /api/vault/test`
- `GET /api/dashboard`
- `GET /api/cron/daily-analytics`
- Legacy X OAuth routes remain outside the main workflow.

## Non-Goals
- No external agent backup layer.
- No hidden backup task routes.
- No server-side persistence for local-vault app data.
