import { POSTIZ_DEFAULT_BASE_URL } from "./constants";

export const POSTIZ_UNAVAILABLE_MESSAGE = "Postiz is temporarily unavailable.";
export const POSTIZ_NOT_CONFIGURED_MESSAGE = "POSTIZ_API_KEY is required";

const POSTIZ_REQUEST_TIMEOUT_MS = 30000;
const LOCAL_POSTIZ_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export type PostizIntegration = {
  id: string;
  name: string;
  identifier: string;
  picture: string | null;
  disabled: boolean;
  profile: string | null;
};

export type PostizListPostsItem = {
  id: string;
  content: string;
  publishDate: string;
  releaseURL: string | null;
  integration: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture: string | null;
  };
};

export type PostizAnalyticsSeries = {
  label: string;
  data: Array<{ total: string; date: string }>;
  percentageChange: number;
};

export type PostizCreatePostItem = {
  integration: { id: string };
  value: Array<{ content: string; image: Array<{ id: string; path: string }> }>;
  settings: Record<string, unknown>;
};

export type PostizCreatePostBody = {
  type: "now" | "schedule" | "draft";
  date: string;
  shortLink: boolean;
  tags: Array<{ value: string; label: string }>;
  posts: PostizCreatePostItem[];
};

export type PostizCreatePostResponseItem = {
  postId: string;
  integration: string;
};

export type PostizUploadResponse = {
  id: string;
  name: string;
  path: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PostizConnectionResponse = {
  connected: boolean;
};

export function getPostizAuthorizationHeader(apiKey: string) {
  return apiKey.trim();
}

function getPostizBaseUrl(value: string) {
  const url = new URL(value);
  const isLocalHost = LOCAL_POSTIZ_HOSTS.has(url.hostname);
  const isAllowedProtocol = url.protocol === "https:" || (url.protocol === "http:" && isLocalHost);

  if (!isAllowedProtocol || url.username || url.password) {
    throw new Error("Postiz URL must be a valid HTTPS URL");
  }

  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function getPostizConfig(options?: { token?: string; baseUrl?: string }) {
  const apiKey = options?.token || process.env.POSTIZ_API_KEY;
  if (!apiKey) {
    throw new Error(POSTIZ_NOT_CONFIGURED_MESSAGE);
  }

  const baseUrl = getPostizBaseUrl(options?.baseUrl || process.env.POSTIZ_BASE_URL || POSTIZ_DEFAULT_BASE_URL);
  return { apiKey, baseUrl };
}

export function isPostizConfigured(options?: { token?: string }): boolean {
  return Boolean(options?.token || process.env.POSTIZ_API_KEY);
}

async function postizRequest<T>(
  path: string,
  init?: RequestInit,
  options?: { token?: string; baseUrl?: string },
): Promise<T> {
  const { apiKey, baseUrl } = getPostizConfig(options);
  const url = `${baseUrl}${path}`;
  const headers = new Headers(init?.headers);

  headers.set("Authorization", getPostizAuthorizationHeader(apiKey));
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(POSTIZ_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Postiz request failed", error);
    throw new Error(POSTIZ_UNAVAILABLE_MESSAGE);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Postiz API error ${response.status}: ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function checkPostizConnection(options?: { token?: string; baseUrl?: string }): Promise<boolean> {
  try {
    const response = await postizRequest<PostizConnectionResponse>("/is-connected", undefined, options);
    return response.connected === true;
  } catch (error) {
    if (error instanceof Error && error.message === POSTIZ_NOT_CONFIGURED_MESSAGE) {
      return false;
    }
    return false;
  }
}

export function listPostizIntegrations(options?: { token?: string; baseUrl?: string }) {
  return postizRequest<PostizIntegration[]>("/integrations", undefined, options);
}

export function listPostizPosts(startDate: Date, endDate: Date, options?: { token?: string; baseUrl?: string }) {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  return postizRequest<{ posts: PostizListPostsItem[] }>(`/posts?${params.toString()}`, undefined, options);
}

export function createPostizPost(body: PostizCreatePostBody, options?: { token?: string; baseUrl?: string }) {
  return postizRequest<PostizCreatePostResponseItem[]>("/posts", {
    method: "POST",
    body: JSON.stringify(body),
  }, options);
}

export async function uploadPostizFile(file: File, options?: { token?: string; baseUrl?: string }) {
  const body = new FormData();
  body.append("file", file, file.name);
  const uploaded = await postizRequest<PostizUploadResponse>("/upload", {
    method: "POST",
    body,
  }, options);

  if (!uploaded.id || !uploaded.path) {
    throw new Error("Postiz did not return media id and path");
  }

  return uploaded;
}

export function getPostizPostAnalytics(postId: string, lookbackDays: number, options?: { token?: string; baseUrl?: string }) {
  const params = new URLSearchParams({ date: String(lookbackDays) });
  return postizRequest<PostizAnalyticsSeries[]>(
    `/analytics/post/${encodeURIComponent(postId)}?${params.toString()}`,
    undefined,
    options,
  );
}

export function getPostizPlatformAnalytics(integrationId: string, lookbackDays: number, options?: { token?: string; baseUrl?: string }) {
  const params = new URLSearchParams({ date: String(lookbackDays) });
  return postizRequest<PostizAnalyticsSeries[]>(
    `/analytics/${encodeURIComponent(integrationId)}?${params.toString()}`,
    undefined,
    options,
  );
}

export function isSupportedPlatformIdentifier(identifier: string): boolean {
  return identifier.trim().length > 0;
}
