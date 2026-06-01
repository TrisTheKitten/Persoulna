import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import {
  getOAuthAvatarUrl,
  toResolvedUserProfile,
  type ResolvedUserProfile,
  type UserProfileRow,
} from "./profile-shared";

export {
  NICKNAME_MAX_LENGTH,
  type ResolvedUserProfile,
  type UserProfileRow,
} from "./profile-shared";

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 2_000_000;
const AVATAR_CONTENT_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function isMissingProfilesTable(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    Boolean(error.message?.toLowerCase().includes("profiles"))
  );
}

export async function getUserProfileRow(userId: string): Promise<UserProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingProfilesTable(error)) {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}

async function insertUserProfile(user: User): Promise<UserProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      nickname: null,
      avatar_url: getOAuthAvatarUrl(user),
    })
    .select("id, nickname, avatar_url, updated_at")
    .single();

  if (error) {
    if (isMissingProfilesTable(error)) {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}

async function syncOAuthAvatarIfMissing(
  user: User,
  profile: UserProfileRow,
): Promise<UserProfileRow> {
  if (profile.avatar_url?.trim()) {
    return profile;
  }

  const oauthAvatar = getOAuthAvatarUrl(user);
  if (!oauthAvatar) {
    return profile;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: oauthAvatar, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id, nickname, avatar_url, updated_at")
    .single();

  if (error) {
    if (isMissingProfilesTable(error)) {
      return profile;
    }
    throw new Error(error.message);
  }

  return data;
}

export async function ensureUserProfile(user: User): Promise<UserProfileRow | null> {
  const existing = await getUserProfileRow(user.id);
  if (existing) {
    return syncOAuthAvatarIfMissing(user, existing);
  }
  return insertUserProfile(user);
}

export async function getResolvedUserProfile(user: User): Promise<ResolvedUserProfile> {
  const profile = await ensureUserProfile(user);
  return toResolvedUserProfile(profile, user);
}

export async function upsertUserProfile(
  userId: string,
  nickname: string | null,
  avatarFile?: File,
): Promise<void> {
  const supabase = await createClient();
  const normalizedNickname = nickname?.trim() || null;
  let avatarUrl: string | null | undefined;

  if (avatarFile && avatarFile.size > 0) {
    const extension = AVATAR_CONTENT_TYPES.get(avatarFile.type);
    if (!extension) {
      throw new Error("Avatar must be a JPG, PNG, or WebP image.");
    }
    if (avatarFile.size > AVATAR_MAX_BYTES) {
      throw new Error("Avatar must be 2 MB or smaller.");
    }

    const avatarPath = `${userId}/avatar-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(avatarPath, avatarFile, {
        cacheControl: "31536000",
        contentType: avatarFile.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
    avatarUrl = data.publicUrl;
  }

  const updateValues = {
    nickname: normalizedNickname,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    if (isMissingProfilesTable(readError)) {
      throw new Error(
        "Profile storage is not set up. Run supabase/migrations/20260523120000_user_profiles.sql in your Supabase project.",
      );
    }
    throw new Error(readError.message);
  }

  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update(updateValues)
      .eq("id", userId);

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("profiles").insert({
    id: userId,
    nickname: normalizedNickname,
    avatar_url: avatarUrl ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
