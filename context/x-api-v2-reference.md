# X API v2 Reference For This Project

Last verified: 2026-05-20  
OpenAPI checked: `X API v2 2.163`, `137` paths, `161` operations.

Use case: a web app where agents use the X API for blog/post publishing, filtered public results, trend analysis, and permitted DM/comment reading and replies.

This file intentionally includes only the X API areas needed for this project. It excludes Ads API, Enterprise/GNIP, Spaces, Lists, Communities, Community Notes, Account Activity, Webhooks, likes, follows, reposts, bookmarks, and unrelated admin surfaces.

## Official Sources

- Local docs index used for discovery: [llms.txt](./llms.txt)
- Root docs index: https://docs.x.com/llms.txt
- Project compliance checklist: [x-api-developer-terms-compliance.md](./x-api-developer-terms-compliance.md)
- X API v2 index: https://docs.x.com/x-api/llms.txt
- OpenAPI spec: https://docs.x.com/openapi.json
- X Developer Agreement: https://docs.x.com/developer-terms/agreement
- X Developer Policy: https://docs.x.com/developer-terms/policy
- API Restricted Use Rules: https://docs.x.com/developer-terms/restricted-use-cases
- Display Requirements: https://docs.x.com/developer-terms/display-requirements
- Geo Guidelines: https://docs.x.com/developer-terms/geo-guidelines
- X API overview: https://docs.x.com/x-api/overview.md
- Authentication: https://docs.x.com/fundamentals/authentication/overview.md
- Fields: https://docs.x.com/x-api/fundamentals/fields.md
- Expansions: https://docs.x.com/x-api/fundamentals/expansions.md
- Data dictionary: https://docs.x.com/x-api/fundamentals/data-dictionary.md
- Data dictionary reference: https://docs.x.com/x-api/fundamentals/data-dictionary/reference.md
- Pagination: https://docs.x.com/x-api/fundamentals/pagination.md
- Rate limits: https://docs.x.com/x-api/fundamentals/rate-limits.md
- Pricing: https://docs.x.com/x-api/getting-started/pricing.md
- Usage and billing: https://docs.x.com/x-api/fundamentals/post-cap.md
- Errors: https://docs.x.com/x-api/fundamentals/response-codes-and-errors.md
- Filtered stream: https://docs.x.com/x-api/posts/filtered-stream/introduction.md
- Search operators: https://docs.x.com/x-api/posts/search/integrate/operators.md
- Filtered stream operators: https://docs.x.com/x-api/posts/filtered-stream/integrate/operators.md
- Trends by WOEID: https://docs.x.com/x-api/trends/trends-by-woeid/introduction.md
- Get Trends by WOEID reference: https://docs.x.com/x-api/trends/get-trends-by-woeid.md
- Personalized Trends: https://docs.x.com/x-api/trends/personalized-trends/introduction.md
- Get Personalized Trends reference: https://docs.x.com/x-api/trends/get-personalized-trends.md
- Direct Messages: https://docs.x.com/x-api/direct-messages/lookup/introduction.md
- Direct Messages quickstart: https://docs.x.com/x-api/direct-messages/lookup/quickstart.md
- Media upload: https://docs.x.com/x-api/media/introduction.md
- Media upload best practices: https://docs.x.com/x-api/media/quickstart/best-practices.md

## Handoff For Research Friend

Send this file and ask them to read it in this order:

1. [x-api-developer-terms-compliance.md](./x-api-developer-terms-compliance.md) to confirm the Developer Agreement and Developer Policy obligations.
2. `Project-Ready Scope` to understand what the app will and will not use.
3. `Authentication And Scopes` to confirm the OAuth permissions and token boundaries.
4. `Limits You Need To Know` to confirm rate limits, query limits, DM limits, media limits, and billing controls.
5. `Data Dictionary For This Project` to confirm which fields and expansions the agents should request.
6. `Endpoint Allow-List` to confirm the exact endpoints the backend should expose to agents.
7. `Minimal Build Set` to separate MVP endpoints from later optional endpoints.

Ask them to double-check only the official docs linked in `Official Sources`, especially rate limits, pricing, auth/scopes, trends, DMs, filtered search/stream, and media upload. Do not ask them to research Ads API, Enterprise/GNIP, Spaces, Lists, Communities, Community Notes, Account Activity, Webhooks, browser scraping, or bulk engagement.

## How To Read This File

If you are building the first version, read only these sections first:

1. [x-api-developer-terms-compliance.md](./x-api-developer-terms-compliance.md)
2. `Project-Ready Scope`
3. `Authentication And Scopes`
4. `Limits You Need To Know`
5. `Endpoint Allow-List`
6. `Minimal Build Set`

Use `Data Dictionary For This Project` when choosing fields/expansions for requests.

## Project-Ready Scope

Use these X API areas:

- Account identity: know which X account is connected.
- Public post/user read: lookup posts, users, own posts, and mentions.
- Comments/replies: X comments are Posts/replies. Use mentions/search/lookup to read them and `POST /2/tweets` to reply.
- Filtered discovery: use recent search first; use filtered stream only if polling is not enough.
- Trends: use WOEID trends for public/location trends; use personalized trends only if user-authenticated and product access requirements are met.
- Posting: create posts, threads, and replies after permission.
- DMs: read DMs with explicit consent; send DM replies only after permission.
- Media: upload media only if posts need images/GIFs/videos.
- Usage/cost: track usage and enforce budgets.
- Compliance: use only if storing or displaying X Content over time.
- Developer Agreement/Policy compliance: enforce [x-api-developer-terms-compliance.md](./x-api-developer-terms-compliance.md) at the backend tool boundary.

Do not use these by default:

- Likes, follows, reposts, bookmarks, list management, community notes, account activity, webhooks, ads, Enterprise firehose/Powerstream, automated bulk engagement, or browser scraping.

## Authentication And Scopes

Use OAuth 2.0 Authorization Code Flow with PKCE for the connected account. Keep tokens in the backend/token vault; agents should call your backend tools, not hold X credentials.

### OAuth Decision For This Project

You do not need OAuth 1.0a as the default auth system for this web app.

Use these instead:

| Need | Use | Why |
| --- | --- | --- |
| Public read-only data, such as public post lookup, recent search, WOEID trends, and filtered stream | App-only OAuth 2.0 Bearer Token | No user is involved; this is app-level read access to public data. |
| User login, own account lookup, posting, replying, reading mentions with user context, DMs, personalized trends, and long-running sessions | OAuth 2.0 Authorization Code Flow with PKCE | Recommended user-context flow for X API v2 with fine-grained scopes. |
| Legacy endpoints or a library/workflow that only supports OAuth 1.0a | OAuth 1.0a User Context | Keep as fallback only. It requires request signing and access token secrets. |
| Enterprise-only APIs requiring HTTP Basic Auth | Basic authentication | Not needed for this project. |

OAuth 1.0a is still supported for many user-context requests, and X apps can enable OAuth 1.0a and OAuth 2.0. But for this project, OAuth 2.0 PKCE is the clean default because it gives scoped access and matches the X API v2 web app flow.

For a single owned X account, authorize that account once through OAuth 2.0 PKCE, store the access/refresh tokens securely on the backend, and refresh them as needed. Even with one account, keep write actions behind explicit approval and keep DM read / DM send as separate product permissions.

| Feature | Auth | Required scopes |
| --- | --- | --- |
| Connected account lookup | OAuth 2 user context | `tweet.read`, `users.read` |
| Public post/user lookup | Bearer token or OAuth 2 user context | app-only bearer, or `tweet.read`, `users.read` |
| Recent search / mentions | Bearer token or OAuth 2 user context | app-only bearer, or `tweet.read`, `users.read` |
| Filtered stream | Bearer token | app bearer token |
| Trends by WOEID | Bearer token | app bearer token |
| Personalized trends | OAuth 2 user context | OAuth 2 user token; docs also call out Premium User Subscription |
| Publish post/reply | OAuth 2 user context | `tweet.read`, `tweet.write`, `users.read` |
| Delete own post | OAuth 2 user context | `tweet.read`, `tweet.write`, `users.read` |
| DM read | OAuth 2 user context | `dm.read`, `tweet.read`, `users.read` |
| DM send | OAuth 2 user context | `dm.write`, `dm.read`, `tweet.read`, `users.read` |
| Media upload | OAuth 2 user context | `media.write` |
| Long-running web app sessions | OAuth 2 user context | add `offline.access` |

Add `offline.access` when you need refresh tokens for long-running sessions. Without `offline.access`, the app should expect to prompt the user again when the access token expires.

## Response Rules To Implement

- Most responses use `data`, optional `includes`, optional `meta`, and sometimes `errors`.
- Always request needed fields explicitly. Defaults are small.
- Use `expansions` to hydrate related objects into `includes`.
- Expansions do not replace ID fields inline; related full objects appear in `includes`.
- You cannot request subfields such as only `public_metrics.like_count`; requesting `public_metrics` returns the whole metrics object.
- Field order in responses may differ from request order, and missing optional fields should be treated as empty, unavailable, or not authorized.
- For pagination, read `meta.next_token` and pass it back as `pagination_token` unless the endpoint explicitly uses `next_token`.
- Treat partial success as normal: a `200` response can still include `errors`.
- Treat `403` as likely missing scope, missing product access, private/protected data, or plan entitlement.
- Back off on `429` using `x-rate-limit-reset`.

Recommended common fields:

```text
tweet.fields=id,text,author_id,created_at,conversation_id,in_reply_to_user_id,referenced_tweets,public_metrics,entities,lang
user.fields=id,name,username,profile_image_url,verified,verified_type
expansions=author_id,referenced_tweets.id,referenced_tweets.id.author_id,in_reply_to_user_id
media.fields=media_key,type,url,preview_image_url,alt_text
```

## Limits You Need To Know

Rate limits and billing are separate. A request can be allowed by rate limits and still cost credits. A request can also hit rate limits even if it does not add billable usage.

Every response can include these rate headers:

| Header | Meaning |
| --- | --- |
| `x-rate-limit-limit` | Maximum requests in the current window. |
| `x-rate-limit-remaining` | Requests remaining in the current window. |
| `x-rate-limit-reset` | Unix timestamp when the window resets. |

On `429`, stop that job, wait until `x-rate-limit-reset`, then retry with backoff. Do not loop blindly.

### Project Endpoint Rate Limits

Current docs say most limits are per 15 minutes unless marked `/24hrs` or `/sec`. `—` means the docs do not list a limit for that auth context.

| Feature | Endpoint | App limit | User limit | Other limit |
| --- | --- | ---: | ---: | --- |
| Lookup posts by IDs | `GET /2/tweets` | `3,500/15min` | `5,000/15min` | Up to 100 IDs per request. |
| Lookup one post | `GET /2/tweets/:id` | `450/15min` | `900/15min` | Use for exact context lookup. |
| Connected user lookup | `GET /2/users/me` | — | `75/15min` | Requires user context. |
| User lookup | `GET /2/users/:id` | `300/15min` | `900/15min` | Same family as username lookup. |
| Username lookup | `GET /2/users/by/username/:username` | `300/15min` | `900/15min` | Resolve username to stable user ID. |
| Own/user posts | `GET /2/users/:id/tweets` | `10,000/15min` | `900/15min` | Owned-read pricing may apply when eligible. |
| Mentions/comments | `GET /2/users/:id/mentions` | `450/15min` | `300/15min` | Main public comment/reply inbox endpoint. |
| Recent search | `GET /2/tweets/search/recent` | `450/15min` | `300/15min` | Last 7 days, 10 default / 100 max results, 512-character query. |
| Recent counts | `GET /2/tweets/counts/recent` | `300/15min` | — | 512-character query. Use before broad searches. |
| Trends by WOEID | `GET /2/trends/by/woeid/:id` | `75/15min` | — | Default 20 trends, max 50. |
| Personalized trends | `GET /2/users/personalized_trends` | `200/24hrs`, `200/15min` | `100/24hrs`, `10/15min` | Requires user token; docs call out Premium User Subscription. |
| Filtered stream | `GET /2/tweets/search/stream` | `50/15min` | — | 1 connection, 1000 rules, 1024 rule length, 250 posts/sec. |
| Get stream rules | `GET /2/tweets/search/stream/rules` | `450/15min` | — | 1000 rules, 1024 rule length. |
| Update stream rules | `POST /2/tweets/search/stream/rules` | `100/15min` | — | Use `dry_run` before saving. |
| Publish post/reply | `POST /2/tweets` | `10,000/24hrs` | `100/15min` | Requires approval in this project. |
| Delete post | `DELETE /2/tweets/:id` | — | `50/15min` | Keep operator/admin only. |
| DM read | `GET /2/dm_events` | — | `15/15min` | 1-100 events per page; up to 30 days of events available. |
| DM event lookup | `GET /2/dm_events/:id` | — | `15/15min` | Use sparingly for exact event lookup. |
| DM conversation read | `GET /2/dm_conversations/:id/dm_events` | — | `15/15min` | 1-100 events per page. |
| DM participant read | `GET /2/dm_conversations/with/:participant_id/dm_events` | — | `15/15min` | 1-100 events per page. |
| Create DM conversation | `POST /2/dm_conversations` | `1,440/24hrs` | `15/15min`, `1,440/24hrs` | Only if DM send is enabled. |
| Send DM by participant | `POST /2/dm_conversations/with/:participant_id/messages` | `1,440/24hrs` | `15/15min`, `1,440/24hrs` | Approved sends only. |
| Send DM by conversation | `POST /2/dm_conversations/:id/messages` | `1,440/24hrs` | `15/15min`, `1,440/24hrs` | Approved sends only. |
| Simple media upload | `POST /2/media/upload` | `50,000/24hrs` | `500/15min` | Use correct media category. |
| Media status | `GET /2/media/upload` | `100,000/24hrs` | `1,000/15min` | Poll async uploads without spamming. |
| Chunked media init | `POST /2/media/upload/initialize` | `180,000/24hrs` | `1,875/15min` | For larger media. |
| Chunked media append | `POST /2/media/upload/:id/append` | `180,000/24hrs` | `1,875/15min` | For upload chunks. |
| Chunked media finalize | `POST /2/media/upload/:id/finalize` | `180,000/24hrs` | `1,875/15min` | Finish upload. |
| Usage tracking | `GET /2/usage/tweets` | `50/15min` | — | Use for budget monitoring. |
| Batch compliance | `POST/GET /2/compliance/jobs` | `150/15min` | — | Only if storing/displaying X Content. |

### Search Limits

- Recent search covers the last 7 days and is available to all developers.
- Full-archive search goes back to 2006, but is not in the minimal project build.
- Recent search returns up to 100 posts per request.
- Full-archive search returns up to 500 posts per request.
- Self-serve query length: recent search `512` characters, full-archive `1,024` characters.
- Enterprise query length: `4,096` characters.
- Operators like `is:reply`, `has:links`, and `-is:retweet` require at least one standalone operator in the query.

### Trend Limits

- Trends by WOEID returns trending topics for a location identified by WOEID.
- Common WOEIDs from the docs: Worldwide `1`, United States `23424977`, United Kingdom `23424975`, Japan `23424856`, New York `2459115`, Los Angeles `2442047`, London `44418`, Tokyo `1118370`.
- `GET /2/trends/by/woeid/:id` supports `max_trends`, default `20`, range `1` to `50`.
- `trend.fields` options are `trend_name` and `tweet_count`.
- Personalized trends return authenticated-user trends and support `personalized_trend.fields=category,post_count,trend_name,trending_since`.
- Treat trends as discovery/context signals, not automatic permission to reply or post.

### DM Limits

- DM lookup endpoints return events for the authenticated user.
- DM event types are `MessageCreate`, `ParticipantsJoin`, and `ParticipantsLeave`.
- DM events from up to 30 days ago are available through lookup endpoints.
- `max_results` for DM event pages is `1` to `100`, default `100`.
- DM read and DM send should be separate product permissions.

### Media Limits

- A post can attach up to 4 photos, 1 animated GIF, or 1 video.
- Images: supported types are `JPG`, `PNG`, `GIF`, `WEBP`; image size must be `<= 5 MB`.
- Animated GIF upload size must be `<= 15 MB`.
- Recommended GIF constraints: resolution `<= 1280x1080`, frames `<= 350`, pixels `<= 300 million`, file size `<= 15 MB`.
- Video uploads should use the async/chunked path.
- Video advanced constraints include frame rate `<= 60 FPS`, dimensions between `32x32` and `1280x1024`, file size `<= 512 MB`, duration from `0.5` to `140` seconds, and aspect ratio between `1:3` and `3:1`.
- Use the correct `media_category`: `tweet_image`, `tweet_video`, `tweet_gif`, `dm_image`, `dm_video`, `dm_gif`, or `subtitles`.
- Use `media_id_string` when storing media IDs in JavaScript or any language that cannot safely represent large integers.

### Billing Limits And Cost Controls

- Reads are charged per resource returned.
- Writes/actions are charged per request.
- Current examples: Post read `$0.005`; User/DM Event/Trend read `$0.010`; Content create `$0.015`; Content create with URL `$0.200`; DM interaction create `$0.015`.
- Owned Reads can be `$0.001` per resource for eligible reads of the developer app owner's own data, including own posts and mentions.
- X documents a 24-hour UTC deduplication window for billable resources, but calls it a soft guarantee.
- Pay-per-usage plans are documented as subject to a monthly cap of 2 million Post reads.
- Add server-side caps before launch: max pages per job, max posts per search, max DM events per run, max publish actions per day, and max daily spend.

## Data Dictionary For This Project

The X API returns minimal fields by default. Your app should request only the fields it needs for the current job.

| Object | Field parameter | Include for this project? | Why |
| --- | --- | --- | --- |
| Post | `tweet.fields` | Yes | Core object for posts, replies, comments, search results, and publishing context. |
| User | `user.fields` | Yes | Needed for account identity, authors, senders, display, and trust signals. |
| Media | `media.fields` | Yes when posts/DMs include media | Needed for images, GIFs, video previews, and accessibility text. |
| DM event | `dm_event.fields` | Yes when DM feature is enabled | Needed for DM triage, sender, conversation, and referenced posts. |
| Trend | `trend.fields` | Yes when trend feature is enabled | Needed for public/location trend discovery. |
| Personalized Trend | `personalized_trend.fields` | Optional | Needed only for authenticated-user personalized trends. |
| Poll | `poll.fields` | Optional | Only needed if a post contains a poll. |
| Place | `place.fields` | Optional and sensitive | Only needed if a post has geo/place data; do not store location separately from the source post. |
| Space/List/Community | `space.fields`, `list.fields`, `community.fields` | No | Not needed for this project. |

### Post Fields

Default Post fields are `id`, `text`, and `edit_history_tweet_ids`.

Use these for the project:

| Field | Use |
| --- | --- |
| `id` | Store source post IDs, published post IDs, reply IDs, and dedupe keys. |
| `text` | Analyze content, draft replies, display review context. |
| `edit_history_tweet_ids` | Track edited posts; returned by default. |
| `author_id` | Expand to the User object and identify who wrote the post. |
| `created_at` | Sort, filter, and show timeline context. |
| `conversation_id` | Group replies/comments into the same conversation thread. |
| `in_reply_to_user_id` | Detect who a reply is addressed to. |
| `referenced_tweets` | Detect reply, quote, and repost relationships. For replies, this usually contains the parent post ID. |
| `attachments` | Find attached media or polls through `media_keys` / `poll_ids`. |
| `entities` | Extract URLs, mentions, hashtags, cashtags, and annotations. |
| `context_annotations` | Optional topic/entity signal for analysis. |
| `lang` | Filter or classify by language. |
| `public_metrics` | Read visible engagement counts: reposts, replies, likes, quotes, bookmarks, impressions. |
| `possibly_sensitive` | Flag content that may need extra review before display or response. |
| `reply_settings` | Know whether the connected account can reply. |
| `note_tweet` | Needed for long-form posts so you can access full text when present. |
| `article` | Needed only if you support X Article metadata. |
| `geo` | Needed only if you support place/location context; handle with care. |
| `withheld` | Know if content is withheld in some jurisdictions. |

Metric fields that usually should not be in the MVP:

| Field | Why |
| --- | --- |
| `non_public_metrics` | Requires user context and is more sensitive. Use only for the authenticated account's own posts if needed. |
| `organic_metrics` | Similar to non-public metrics; not needed for basic triage. |
| `promoted_metrics` | Advertising/promoted context; not needed unless you later add ads/enterprise analytics. |

Recommended Post request presets:

```text
# Review/search/comment context
tweet.fields=id,text,author_id,created_at,conversation_id,in_reply_to_user_id,referenced_tweets,attachments,entities,lang,public_metrics,possibly_sensitive,reply_settings,note_tweet
expansions=author_id,referenced_tweets.id,referenced_tweets.id.author_id,in_reply_to_user_id,attachments.media_keys,attachments.poll_ids,geo.place_id
user.fields=id,name,username,profile_image_url,verified,verified_type,protected
media.fields=media_key,type,url,preview_image_url,alt_text,width,height,duration_ms,public_metrics
poll.fields=id,options,duration_minutes,end_datetime,voting_status
place.fields=id,full_name,name,country,country_code,place_type

# Lightweight dedupe/counting
tweet.fields=id,author_id,created_at,conversation_id
```

### User Fields

Default User fields are `id`, `name`, and `username`.

Use these for the project:

| Field | Use |
| --- | --- |
| `id` | Stable user identifier. Store this instead of relying only on username. |
| `name` | Display name in the app. |
| `username` | Handle for display, search query construction, and links. |
| `profile_image_url` | Display sender/author avatars. |
| `verified` | Basic verification signal. |
| `verified_type` | More specific verification type when returned. |
| `protected` | Know when public post access may be limited. |
| `description` | Optional context for important sender/author analysis. |
| `created_at` | Optional account-age signal. |
| `public_metrics` | Optional follower/following/post counts for prioritization. |
| `entities` | Parse URLs/mentions/hashtags in profile description. |
| `url` | Profile URL field, if present. |
| `location` | Optional freeform profile location; do not treat as verified location. |
| `connection_status` | Useful only when authenticated user relationship context matters. |
| `receives_your_dm` | Useful before attempting an approved DM send, when available. |

Avoid requesting unless clearly needed:

| Field | Why |
| --- | --- |
| `confirmed_email` | Sensitive authenticated-user data; not needed for this app's X workflow. |
| `subscription`, `subscription_type` | Not needed unless product specifically uses X Premium status. |
| `affiliation`, `parody`, `withheld` | Use only if the UI or safety logic needs these signals. |

Recommended User preset:

```text
user.fields=id,name,username,profile_image_url,verified,verified_type,protected,description,created_at,public_metrics
```

### Media Fields

Media is usually returned through `expansions=attachments.media_keys` for posts or `expansions=attachments.media_keys` for DM events.

Use these for the project:

| Field | Use |
| --- | --- |
| `media_key` | Stable key for media object. |
| `type` | Detect `photo`, `video`, or `animated_gif`. |
| `url` | Direct image URL for photos when returned. |
| `preview_image_url` | Preview image for video/GIF. |
| `alt_text` | Accessibility text; useful before re-sharing or analyzing media context. |
| `width`, `height` | UI rendering and media layout. |
| `duration_ms` | Video/GIF duration. |
| `public_metrics` | Public video view count when available. |
| `variants` | Video playback variants when needed. |

Recommended Media preset:

```text
media.fields=media_key,type,url,preview_image_url,alt_text,width,height,duration_ms,public_metrics,variants
```

### Poll And Place Fields

Polls and Places are not primary project objects, but they can appear inside posts.

Use Poll fields only when `attachments.poll_ids` exists:

```text
poll.fields=id,options,duration_minutes,end_datetime,voting_status
```

Use Place fields only when `geo.place_id` exists:

```text
place.fields=id,full_name,name,country,country_code,place_type
```

Location rule: do not store, aggregate, or use place/location data separately from the source post.

### Direct Message Event Fields

Default DM event fields are `id`, `event_type`, and `text`.

Supported event types in the docs are `MessageCreate`, `ParticipantsJoin`, and `ParticipantsLeave`.

Use these for the project:

| Field | Use |
| --- | --- |
| `id` | Store event ID, dedupe, lookup one event. |
| `event_type` | Distinguish messages from participant join/leave events. |
| `text` | Analyze or summarize DM message content. Avoid long-term raw storage unless necessary. |
| `dm_conversation_id` | Group events by conversation and send approved replies to the correct thread. |
| `created_at` | Sort, triage, and display timestamps. |
| `sender_id` | Expand to User object and identify sender. |
| `participant_ids` | Understand conversation participants. |
| `attachments` | Expand attached media. |
| `referenced_tweets` | Detect posts shared inside DMs and hydrate them if needed. |
| `entities` | Parse URLs, mentions, hashtags in DM text. |

Recommended DM event preset:

```text
dm_event.fields=id,event_type,text,dm_conversation_id,created_at,sender_id,participant_ids,attachments,referenced_tweets,entities
expansions=sender_id,participant_ids,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id
user.fields=id,name,username,profile_image_url,verified,verified_type,protected
tweet.fields=id,text,author_id,created_at,conversation_id,public_metrics,possibly_sensitive
media.fields=media_key,type,url,preview_image_url,alt_text
```

DM privacy rule: separate DM read permission from DM send permission. Store IDs, labels, summaries, and drafts by default; avoid storing full raw DM text.

### Trend Fields

Use trends for content planning, market/context awareness, and analysis prompts. Do not use trends to trigger automatic public replies.

Trends by WOEID fields:

| Field | Use |
| --- | --- |
| `trend_name` | Trend keyword/hashtag/topic name. |
| `tweet_count` | Approximate post volume when available. |

Recommended WOEID trend preset:

```text
max_trends=50
trend.fields=trend_name,tweet_count
```

Personalized trend fields:

| Field | Use |
| --- | --- |
| `trend_name` | Personalized trend keyword/hashtag/topic name. |
| `category` | Category label when returned. |
| `post_count` | Trend volume when returned. |
| `trending_since` | Timestamp/string for when the trend started, when returned. |

Recommended personalized trend preset:

```text
personalized_trend.fields=category,post_count,trend_name,trending_since
```

## Endpoint Allow-List

### Account And User Lookup

Use for connected account identity and basic user display.

| Operation ID | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| `getUsersMe` | GET | `/2/users/me` | OAuth 2: `tweet.read`, `users.read` | Identify the connected account. |
| `getUsersByUsername` | GET | `/2/users/by/username/{username}` | Bearer or OAuth 2: `tweet.read`, `users.read` | Resolve usernames to user IDs. |
| `getUsersById` | GET | `/2/users/{id}` | Bearer or OAuth 2: `tweet.read`, `users.read` | Fetch profile metadata. |

### Public Posts, Own Posts, And Comments

Use for blog/post analysis, comment/reply triage, and context lookup.

| Operation ID | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| `getPostsById` | GET | `/2/tweets/{id}` | Bearer or OAuth 2: `tweet.read`, `users.read` | Lookup one post/reply. |
| `getPostsByIds` | GET | `/2/tweets` | Bearer or OAuth 2: `tweet.read`, `users.read` | Lookup up to multiple post IDs. |
| `getUsersPosts` | GET | `/2/users/{id}/tweets` | Bearer or OAuth 2: `tweet.read`, `users.read` | Read the account's own posts. Owned-read pricing can apply when eligible. |
| `getUsersMentions` | GET | `/2/users/{id}/mentions` | Bearer or OAuth 2: `tweet.read`, `users.read` | Main endpoint for public comments/replies mentioning the account. |

Important: X API v2 does not have a separate "comments" object for this project. Public comments are Posts/replies. Read them through mentions, search, and post lookup.

### Search And Filtered Results

Use recent search first. Use filtered stream only when polling is not enough.

| Operation ID | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| `searchPostsRecent` | GET | `/2/tweets/search/recent` | Bearer or OAuth 2: `tweet.read`, `users.read` | Search recent public posts. Query is required. Max result/rate limits apply. |
| `getPostsCountsRecent` | GET | `/2/tweets/counts/recent` | Bearer token | Estimate query volume before fetching many posts. |
| `getRules` | GET | `/2/tweets/search/stream/rules` | Bearer token | Optional filtered stream rule management. |
| `updateRules` | POST | `/2/tweets/search/stream/rules` | Bearer token | Optional. Add/delete stream rules. Use `dry_run` before saving. |
| `getRuleCounts` | GET | `/2/tweets/search/stream/rules/counts` | Bearer token | Optional. Inspect rule counts. |
| `streamPosts` | GET | `/2/tweets/search/stream` | Bearer token | Optional persistent stream. Requires reconnect/backoff/dedupe handling. |

Rate notes from current docs:

- Recent search: 10 default / 100 max results; 512 query length.
- Recent counts: 512 query length.
- Filtered stream: 1 connection, up to 1000 rules, 1024 rule length, and documented 250 posts/sec cap.

Useful query patterns for this project:

| Goal | Query pattern |
| --- | --- |
| Replies/comments to your account | `to:your_username is:reply` |
| Replies in one post's conversation | `conversation_id:POST_ID is:reply` |
| Posts from your account | `from:your_username` |
| Posts linking to your blog/domain | `url:"https://your-domain.com"` |
| Brand/project mentions | `"project name" OR @your_username` |
| Exclude reposts | add `-is:retweet` |

Use `getPostsCountsRecent` before fetching if a query might be broad.

### Trends

Use for trend-aware planning and analysis. Trends should inform drafts and reports, not auto-trigger public engagement.

| Operation ID | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| `getTrendsByWoeid` | GET | `/2/trends/by/woeid/{woeid}` | Bearer token | Public/location trends. Use `max_trends` and `trend.fields`. |
| `getPersonalizedTrends` | GET | `/2/users/personalized_trends` | OAuth 2 user token | Optional. Docs call out Premium User Subscription. Use only for the connected user's own trend context. |

Recommended default: start with `getTrendsByWoeid` using Worldwide or a configured target market WOEID. Add personalized trends later only if the product truly needs per-user trend context.

### Posting Blog Posts, Threads, And Replies

Use only after the user approves the exact text.

| Operation ID | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| `createPosts` | POST | `/2/tweets` | OAuth 2: `tweet.read`, `tweet.write`, `users.read` | Create a post, thread post, or reply. Reply by setting the reply target in the body. |
| `deletePosts` | DELETE | `/2/tweets/{id}` | OAuth 2: `tweet.read`, `tweet.write`, `users.read` | Optional rollback/admin action only. |

Posting rules:

- Show exact final text before publishing.
- Store the approved draft, approver, source IDs, and returned post ID.
- For replies, store the original post ID and resulting reply ID.
- Do not auto-reply to broad keywords, trending topics, or random public posts.

### Direct Messages

Use only after the connected user explicitly enables DM access.

| Operation ID | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| `getDirectMessagesEvents` | GET | `/2/dm_events` | OAuth 2: `dm.read`, `tweet.read`, `users.read` | Read DM events. Use pagination and per-run limits. |
| `getDirectMessagesEventsById` | GET | `/2/dm_events/{event_id}` | OAuth 2: `dm.read`, `tweet.read`, `users.read` | Lookup one DM event. |
| `getDirectMessagesEventsByConversationId` | GET | `/2/dm_conversations/{id}/dm_events` | OAuth 2: `dm.read`, `tweet.read`, `users.read` | Read events in a known conversation. |
| `getDirectMessagesEventsByParticipantId` | GET | `/2/dm_conversations/with/{participant_id}/dm_events` | OAuth 2: `dm.read`, `tweet.read`, `users.read` | Read conversation with a participant. |
| `createDirectMessagesByConversationId` | POST | `/2/dm_conversations/{dm_conversation_id}/messages` | OAuth 2: `dm.write`, `dm.read`, `tweet.read`, `users.read` | Send approved DM reply to an existing conversation. |
| `createDirectMessagesByParticipantId` | POST | `/2/dm_conversations/with/{participant_id}/messages` | OAuth 2: `dm.write`, `dm.read`, `tweet.read`, `users.read` | Send approved DM reply to a participant. |
| `createDirectMessagesConversation` | POST | `/2/dm_conversations` | OAuth 2: `dm.write`, `dm.read`, `tweet.read`, `users.read` | Create a DM conversation only if product needs it. |

DM rules:

- DM read and DM send must be separate toggles.
- Prefer storing DM IDs, sender IDs, timestamps, labels, summaries, and drafts.
- Avoid long-term raw DM text storage unless absolutely necessary.
- Never expose DM content to another user.
- Do not send automatic DM outreach.

### Media For Posts

Use only if posts need images, videos, or GIFs.

| Operation ID | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| `mediaUpload` | POST | `/2/media/upload` | OAuth 2: `media.write` | Simple upload where supported. |
| `initializeMediaUpload` | POST | `/2/media/upload/initialize` | OAuth 2: `media.write` | Start chunked/large media upload. |
| `appendMediaUpload` | POST | `/2/media/upload/{id}/append` | OAuth 2: `media.write` | Upload chunk. |
| `finalizeMediaUpload` | POST | `/2/media/upload/{id}/finalize` | OAuth 2: `media.write` | Finalize upload. |
| `getMediaUploadStatus` | GET | `/2/media/upload` | OAuth 2: `media.write` | Poll async processing status. |

Flow: initialize, append/upload, finalize, poll status when async, then attach the returned media key to `createPosts`.

### Usage And Billing

| Operation ID | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| `getUsage` | GET | `/2/usage/tweets` | Bearer token | Track Post consumption. |

Pricing notes from current docs:

- X API is pay-per-usage.
- Reads are charged per returned resource; writes/actions are charged per request.
- Current examples: Post read `$0.005`; User/DM Event/Trend read `$0.010`; Content create `$0.015`; Content create with URL `$0.200`; DM interaction create `$0.015`.
- Owned Reads can be `$0.001` per resource for eligible reads of the developer app owner's own data, including own posts and mentions.
- Resources are documented as deduplicated within a 24-hour UTC day window, but X calls this a soft guarantee.
- Pay-per-usage plans are documented as subject to a monthly cap of 2 million Post reads.
- Confirm exact current pricing in the Developer Console before production.

### Compliance If Storing Or Displaying X Content

Use only if the web app stores or displays X Content beyond transient processing.

| Operation ID | Method | Path | Auth | Notes |
| --- | --- | --- | --- | --- |
| `createComplianceJobs` | POST | `/2/compliance/jobs` | Bearer token | Create batch compliance job. |
| `getComplianceJobs` | GET | `/2/compliance/jobs` | Bearer token | List jobs by type/status. |
| `getComplianceJobsById` | GET | `/2/compliance/jobs/{id}` | Bearer token | Inspect one job. |

Best default: store X IDs, generated summaries, drafts, approvals, result IDs, and metric snapshots. Avoid storing large raw X datasets or raw DM text.

## Minimal Build Set

Start with this exact set:

- `getUsersMe`
- `getUsersByUsername`
- `getUsersById`
- `getPostsById`
- `getPostsByIds`
- `getUsersPosts`
- `getUsersMentions`
- `searchPostsRecent`
- `getPostsCountsRecent`
- `getTrendsByWoeid`
- `createPosts`
- `getDirectMessagesEvents`
- `getDirectMessagesEventsById`
- `getDirectMessagesEventsByConversationId`
- `getDirectMessagesEventsByParticipantId`
- `getUsage`

Add later only when needed:

- Filtered stream: `getRules`, `updateRules`, `getRuleCounts`, `streamPosts`
- Personalized trends: `getPersonalizedTrends`
- DM send: `createDirectMessagesByConversationId`, `createDirectMessagesByParticipantId`, `createDirectMessagesConversation`
- Media: `mediaUpload`, `initializeMediaUpload`, `appendMediaUpload`, `finalizeMediaUpload`, `getMediaUploadStatus`
- Compliance: `createComplianceJobs`, `getComplianceJobs`, `getComplianceJobsById`
- Delete post: `deletePosts`

## Hard Requirements For This Project

- Read and enforce [x-api-developer-terms-compliance.md](./x-api-developer-terms-compliance.md) before exposing X tools to agents.
- Every write action needs explicit user permission unless you later define a narrower approved mode.
- DM read requires explicit opt-in.
- DM send requires separate explicit opt-in.
- Agents should not receive raw X credentials.
- Enforce per-job limits for pages, returned posts, returned DM events, and spend.
- Log approvals and published IDs.
- Use official API endpoints only; do not scrape X through browser automation.
- Do not use X API or X Content to train or fine-tune foundation/frontier models.
- Do not use X Content or X-derived analysis for off-X ad targeting.
- Do not build sensitive profiling, surveillance, sensitive-event monitoring, or pay-to-engage flows.
- Re-check docs before launch because access, pricing, rate limits, and scopes can change.
