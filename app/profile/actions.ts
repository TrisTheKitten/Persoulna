"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NICKNAME_MAX_LENGTH, upsertUserProfile } from "@/src/lib/profile";
import { requireAuthenticatedUser } from "@/src/lib/supabase/server";

export async function saveUserProfileAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const nicknameValue = formData.get("nickname");
  const avatarValue = formData.get("avatar");
  const nickname =
    typeof nicknameValue === "string" ? nicknameValue.trim() : "";
  const avatarFile = avatarValue instanceof File ? avatarValue : undefined;

  if (nickname.length > NICKNAME_MAX_LENGTH) {
    redirect(
      `/settings?error=${encodeURIComponent(`Nickname must be ${NICKNAME_MAX_LENGTH} characters or fewer.`)}`,
    );
  }

  try {
    await upsertUserProfile(user.id, nickname || null, avatarFile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save profile.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/write");
  revalidatePath("/settings");
  revalidatePath("/analytics");
  redirect("/settings?success=1");
}
