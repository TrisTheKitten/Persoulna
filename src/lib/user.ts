import { requireAuthenticatedUser } from "./supabase/server";

export async function ensureDefaultUser() {
  const user = await requireAuthenticatedUser();
  return {
    id: user.id,
    email: user.email ?? null,
  };
}

export async function ensureRuntimeSetup(): Promise<{
  user: { id: string; email: string | null };
}> {
  await ensureDefaultUser();
  throw new Error("Server-side app persistence is disabled. Unlock the browser vault to continue.");
}
