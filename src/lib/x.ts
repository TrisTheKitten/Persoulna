import { Prisma, type ConnectedXAccount } from "@prisma/client";
import { TwitterApi } from "twitter-api-v2";
import {
  CONNECTION_STATUS,
  DEFAULT_USER_ID,
  IMAGE_MIME_TYPE_PREFIX,
  RECENT_POST_LIMIT,
  TOKEN_EXPIRY_STATUS,
  UNAVAILABLE_STATUS,
  X_POST_LOOKUP_LIMIT,
} from "./constants";
import { prisma } from "./db";

type XUnavailable = {
  status: typeof UNAVAILABLE_STATUS;
  reason: string;
};

const X_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const X_UNAUTHORIZED_STATUS_CODE = 401;
const DATA_URL_PREFIX = "data:";
const DATA_URL_BASE64_SEPARATOR = ";base64,";

export function hasScope(scopes: unknown, requiredScope: string): boolean {
  if (Array.isArray(scopes)) {
    return scopes.includes(requiredScope);
  }
  return false;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return { message: String(error) };
}

function toDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOriginalPost(tweet: { referenced_tweets?: Array<{ type?: string }> }) {
  return !tweet.referenced_tweets?.some(
    (reference) =>
      reference.type === "replied_to" || reference.type === "retweeted",
  );
}

function isUnauthorizedXError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === X_UNAUTHORIZED_STATUS_CODE
  );
}

function parseImageDataUrl(dataUrl: string) {
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) {
    throw new Error("Image upload data is invalid");
  }

  const separatorIndex = dataUrl.indexOf(DATA_URL_BASE64_SEPARATOR);
  if (separatorIndex === -1) {
    throw new Error("Image upload data is invalid");
  }

  const mimeType = dataUrl
    .slice(DATA_URL_PREFIX.length, separatorIndex)
    .toLowerCase();

  if (!mimeType.startsWith(IMAGE_MIME_TYPE_PREFIX)) {
    throw new Error("Only image files are supported");
  }

  return {
    mimeType,
    buffer: Buffer.from(
      dataUrl.slice(separatorIndex + DATA_URL_BASE64_SEPARATOR.length),
      "base64",
    ),
  };
}

async function refreshUserXClient(account: ConnectedXAccount) {
  if (!account.refreshToken) {
    throw new Error("X authorization expired. Reconnect X in settings.");
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId) {
    throw new Error("X_CLIENT_ID environment variable is missing");
  }

  try {
    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    const {
      client: refreshedClient,
      accessToken,
      refreshToken,
      expiresIn,
      scope,
    } = await client.refreshOAuth2Token(account.refreshToken);

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (expiresIn || 0));

    await prisma.connectedXAccount.update({
      where: { userId: DEFAULT_USER_ID },
      data: {
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiresAt,
        availableScopes: scope || [],
        tokenExpiryStatus: TOKEN_EXPIRY_STATUS.valid,
        connectionStatus: CONNECTION_STATUS.connected,
        lastVerifiedAt: new Date(),
      },
    });

    return refreshedClient;
  } catch (error: any) {
    await prisma.connectedXAccount.update({
      where: { userId: DEFAULT_USER_ID },
      data: {
        connectionStatus: CONNECTION_STATUS.failed,
        tokenExpiryStatus: TOKEN_EXPIRY_STATUS.expired,
        rawVerification: {
          message: error?.message || String(error),
          name: error?.name || "RefreshError",
        },
      },
    });
    throw new Error("X authorization expired. Reconnect X in settings.");
  }
}

export async function syncXConnectionFromEnv() {
  const userId = DEFAULT_USER_ID;
  const existing = await prisma.connectedXAccount.findUnique({
    where: { userId },
  });
  if (existing) {
    return existing;
  }
  const defaultData = {
    userId,
    xUserId: null,
    xUsername: null,
    connectionStatus: CONNECTION_STATUS.missing,
    availableScopes: [],
    tokenExpiryStatus: TOKEN_EXPIRY_STATUS.unknown,
    credentialsSource: "oauth2_pkce",
  };
  return prisma.connectedXAccount.create({
    data: defaultData,
  });
}

export async function getUserXClient() {
  const userId = DEFAULT_USER_ID;
  const account = await prisma.connectedXAccount.findUnique({
    where: { userId },
  });

  if (!account || account.connectionStatus !== CONNECTION_STATUS.connected || !account.accessToken) {
    throw new Error("A connected X account is required");
  }

  const now = new Date();
  const isNearExpiry = account.tokenExpiresAt
    ? new Date(account.tokenExpiresAt).getTime() - now.getTime() < X_TOKEN_REFRESH_BUFFER_MS
    : true;

  if (isNearExpiry) {
    return refreshUserXClient(account);
  }

  return new TwitterApi(account.accessToken);
}

export async function getFreshUserXClient() {
  const account = await prisma.connectedXAccount.findUnique({
    where: { userId: DEFAULT_USER_ID },
  });

  if (!account || account.connectionStatus !== CONNECTION_STATUS.connected || !account.accessToken) {
    throw new Error("A connected X account is required");
  }

  return refreshUserXClient(account);
}

export async function verifyXConnection() {
  const account = await syncXConnectionFromEnv();

  if (account.connectionStatus !== CONNECTION_STATUS.connected) {
    return account;
  }

  try {
    const client = await getUserXClient();
    const verifiedUser = await client.v2.me();
    return prisma.connectedXAccount.update({
      where: { userId: DEFAULT_USER_ID },
      data: {
        xUserId: verifiedUser.data.id,
        xUsername: verifiedUser.data.username,
        lastVerifiedAt: new Date(),
        rawVerification: verifiedUser as unknown as Prisma.InputJsonValue,
        connectionStatus: CONNECTION_STATUS.connected,
      },
    });
  } catch (error) {
    return prisma.connectedXAccount.update({
      where: { userId: DEFAULT_USER_ID },
      data: {
        connectionStatus: CONNECTION_STATUS.failed,
        rawVerification: serializeError(error) as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

export async function fetchRecentOriginalPosts() {
  const account = await prisma.connectedXAccount.findUnique({
    where: { userId: DEFAULT_USER_ID },
  });

  if (!account || account.connectionStatus !== CONNECTION_STATUS.connected || !account.xUserId) {
    throw new Error("A configured X connection is required");
  }

  if (!hasScope(account.availableScopes, "tweet.read") || !hasScope(account.availableScopes, "users.read")) {
    throw new Error("Missing required scopes: tweet.read and/or users.read");
  }

  try {
    const client = await getUserXClient();
    const timeline = await client.v2.userTimeline(account.xUserId, {
      max_results: X_POST_LOOKUP_LIMIT,
      exclude: ["replies", "retweets"],
      "tweet.fields": ["created_at", "public_metrics", "referenced_tweets"],
    });

    const tweets = (timeline.tweets ?? [])
      .filter(isOriginalPost)
      .slice(0, RECENT_POST_LIMIT);

    await Promise.all(
      tweets.map((tweet) =>
        prisma.recentXPostSnapshot.upsert({
          where: {
            userId_xPostId: {
              userId: DEFAULT_USER_ID,
              xPostId: tweet.id,
            },
          },
          update: {
            text: tweet.text,
            createdAtX: toDate(tweet.created_at),
            publicMetrics:
              (tweet.public_metrics as unknown as Prisma.InputJsonValue) ??
              Prisma.JsonNull,
            rawXResponse: tweet as unknown as Prisma.InputJsonValue,
            fetchedAt: new Date(),
          },
          create: {
            userId: DEFAULT_USER_ID,
            xPostId: tweet.id,
            text: tweet.text,
            createdAtX: toDate(tweet.created_at),
            publicMetrics:
              (tweet.public_metrics as unknown as Prisma.InputJsonValue) ??
              Prisma.JsonNull,
            rawXResponse: tweet as unknown as Prisma.InputJsonValue,
          },
        }),
      ),
    );

    return tweets;
  } catch (error: any) {
    const serialized = serializeError(error);
    await prisma.connectedXAccount.update({
      where: { userId: DEFAULT_USER_ID },
      data: {
        connectionStatus: CONNECTION_STATUS.failed,
        rawVerification: serialized as unknown as Prisma.InputJsonValue,
      },
    });
    const detail = error?.error?.detail || error?.message || String(error);
    throw new Error(`X API connection failed: ${detail}`);
  }
}

async function optionalXRequest<T>(
  field: string,
  request: () => Promise<T>,
): Promise<{ field: string; data: T } | { field: string; unavailable: XUnavailable }> {
  try {
    return { field, data: await request() };
  } catch (error) {
    return {
      field,
      unavailable: {
        status: UNAVAILABLE_STATUS,
        reason: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function fetchEngagementSnapshot() {
  const account = await prisma.connectedXAccount.findUnique({
    where: { userId: DEFAULT_USER_ID },
  });

  if (!account || account.connectionStatus !== CONNECTION_STATUS.connected) {
    throw new Error("A configured X connection is required");
  }

  await fetchRecentOriginalPosts();
  const latestPosts = await prisma.recentXPostSnapshot.findMany({
    where: { userId: DEFAULT_USER_ID },
    orderBy: [{ createdAtX: "desc" }, { fetchedAt: "desc" }],
    take: RECENT_POST_LIMIT,
  });

  const client = await getUserXClient();
  const posts = [];
  const unavailableFields: Array<{
    post_id: string;
    field: string;
    status: typeof UNAVAILABLE_STATUS;
    reason: string;
  }> = [];

  for (const post of latestPosts) {
    const replies = await optionalXRequest("replies", async () => {
      if (!hasScope(account.availableScopes, "tweet.read")) {
        throw new Error("Missing tweet.read scope");
      }
      const result = await client.v2.search(`conversation_id:${post.xPostId} is:reply`, {
        max_results: 10,
        "tweet.fields": ["created_at", "public_metrics", "author_id"],
      });
      return result.tweets || [];
    });

    const likingUsers = await optionalXRequest("liking_users", async () => {
      if (!hasScope(account.availableScopes, "like.read")) {
        throw new Error("Missing like.read scope");
      }
      const result = await client.v2.tweetLikedBy(post.xPostId, {
        asPaginator: true,
        max_results: 10,
      });
      return result.users || [];
    });

    const repostingUsers = await optionalXRequest("reposting_users", async () => {
      if (!hasScope(account.availableScopes, "tweet.read")) {
        throw new Error("Missing tweet.read scope");
      }
      const result = await client.v2.tweetRetweetedBy(post.xPostId, {
        asPaginator: true,
        max_results: 10,
      });
      return result.users || [];
    });

    for (const result of [replies, likingUsers, repostingUsers]) {
      if ("unavailable" in result) {
        unavailableFields.push({
          post_id: post.xPostId,
          field: result.field,
          status: result.unavailable.status,
          reason: result.unavailable.reason,
        });
      }
    }

    posts.push({
      x_post_id: post.xPostId,
      text: post.text,
      created_at_x: post.createdAtX,
      public_metrics: post.publicMetrics,
      replies: "data" in replies ? replies.data : replies.unavailable,
      liking_users: "data" in likingUsers ? likingUsers.data : likingUsers.unavailable,
      reposting_users:
        "data" in repostingUsers ? repostingUsers.data : repostingUsers.unavailable,
    });
  }

  // Fetch Direct Messages
  const dms = await optionalXRequest("direct_messages", async () => {
    if (!hasScope(account.availableScopes, "dm.read")) {
      throw new Error("Missing dm.read scope");
    }
    const dmsResult = await client.v2.get("dm_events", {
      "dm_event.fields": "created_at,sender_id,text,dm_conversation_id",
      max_results: 100,
    });
    return dmsResult?.data || [];
  });

  if ("unavailable" in dms) {
    unavailableFields.push({
      post_id: "global",
      field: "direct_messages",
      status: dms.unavailable.status,
      reason: dms.unavailable.reason,
    });
  }

  // Persist only sanitized DMs without the text field in SQLite
  const rawDms = "data" in dms ? dms.data : [];
  const sanitizedDms = rawDms.map(({ text, ...rest }: any) => rest);

  const snapshot = await prisma.engagementSnapshot.create({
    data: {
      userId: DEFAULT_USER_ID,
      posts: posts as unknown as Prisma.InputJsonValue,
      unavailableFields: unavailableFields as unknown as Prisma.InputJsonValue,
      rawXResponse: { posts, dms: sanitizedDms } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    snapshot,
    rawDms, // Passed in-memory only
  };
}

export async function uploadImagesToX(imageDataUrls: string[]) {
  if (imageDataUrls.length === 0) {
    throw new Error("Image post requires at least one image");
  }

  const account = await prisma.connectedXAccount.findUnique({
    where: { userId: DEFAULT_USER_ID },
  });

  if (!account || !hasScope(account.availableScopes, "media.write")) {
    throw new Error("Missing required scope: media.write");
  }

  const uploadWithClient = async (client: TwitterApi) =>
    Promise.all(
      imageDataUrls.map((dataUrl) => {
        const image = parseImageDataUrl(dataUrl);
        return client.v2.uploadMedia(image.buffer, {
          media_type: image.mimeType as any,
        });
      }),
    );

  const client = await getUserXClient();
  try {
    return await uploadWithClient(client);
  } catch (error) {
    if (!isUnauthorizedXError(error)) {
      throw error;
    }

    const refreshedClient = await refreshUserXClient(account);
    return uploadWithClient(refreshedClient);
  }
}

export async function publishApprovedDraftToX(
  finalText: string,
  media?: {
    mediaIds: string[];
    altText: string | null;
  },
) {
  const account = await prisma.connectedXAccount.findUnique({
    where: { userId: DEFAULT_USER_ID },
  });

  if (!account || !hasScope(account.availableScopes, "tweet.write")) {
    throw new Error("Missing required scope: tweet.write");
  }

  const client = await getUserXClient();
  const tweetPayload = media?.mediaIds.length
    ? {
        text: finalText,
        media: {
          media_ids: media.mediaIds as [string] | [string, string] | [string, string, string] | [string, string, string, string],
        },
      }
    : null;
  const publishWithClient = async (xClient: TwitterApi) => {
    if (media?.mediaIds.length) {
      if (!media.altText) {
        throw new Error("Alt text is required for image posts");
      }
      const altText = media.altText;

      await Promise.all(
        media.mediaIds.map((mediaId) =>
          xClient.v2.createMediaMetadata(mediaId, {
            alt_text: {
              text: altText,
            },
          }),
        ),
      );
      return xClient.v2.tweet(tweetPayload!);
    }

    return xClient.v2.tweet(finalText);
  };

  try {
    return await publishWithClient(client);
  } catch (error) {
    if (!isUnauthorizedXError(error)) {
      throw error;
    }

    const refreshedClient = await refreshUserXClient(account);

    try {
      return await publishWithClient(refreshedClient);
    } catch (retryError) {
      if (isUnauthorizedXError(retryError)) {
        await prisma.connectedXAccount.update({
          where: { userId: DEFAULT_USER_ID },
          data: {
            connectionStatus: CONNECTION_STATUS.failed,
            tokenExpiryStatus: TOKEN_EXPIRY_STATUS.expired,
            rawVerification: serializeError(retryError) as unknown as Prisma.InputJsonValue,
          },
        });
        throw new Error("X authorization expired. Reconnect X in settings.");
      }
      throw retryError;
    }
  }
}
