const SUPABASE_REST_PATH_SUFFIX = "/rest/v1";

function normalizeSupabaseUrl(url: string) {
  const trimmedUrl = url.trim().replace(/\/+$/, "");
  return trimmedUrl.endsWith(SUPABASE_REST_PATH_SUFFIX)
    ? trimmedUrl.slice(0, -SUPABASE_REST_PATH_SUFFIX.length)
    : trimmedUrl;
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase environment variables are required");
  }

  return {
    url: normalizeSupabaseUrl(url),
    publishableKey,
  };
}
