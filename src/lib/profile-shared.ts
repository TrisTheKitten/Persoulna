import type { User } from "@supabase/supabase-js";

export const NICKNAME_MAX_LENGTH = 32;

export type UserProfileRow = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  updated_at: string;
};

export type ResolvedUserProfile = {
  displayName: string;
  avatarUrl: string | null;
  avatarInitial: string;
  nickname: string | null;
};

function readMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getOAuthAvatarUrl(user: User): string | null {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return (
    readMetadataString(metadata, "avatar_url") ??
    readMetadataString(metadata, "picture")
  );
}

export function getOAuthFullName(user: User): string | null {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return (
    readMetadataString(metadata, "full_name") ?? readMetadataString(metadata, "name")
  );
}

export function getOAuthFirstName(user: User): string | null {
  const fullName = getOAuthFullName(user);
  if (!fullName) {
    return null;
  }
  return fullName.split(/\s+/)[0] ?? null;
}

export function resolveDisplayName(
  profile: UserProfileRow | null,
  user: User,
): string {
  const nickname = profile?.nickname?.trim();
  if (nickname) {
    return nickname;
  }

  const oauthFirstName = getOAuthFirstName(user);
  if (oauthFirstName) {
    return oauthFirstName;
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();
  if (emailPrefix) {
    return emailPrefix;
  }

  return "there";
}

export function resolveAvatarUrl(
  profile: UserProfileRow | null,
  user: User,
): string | null {
  const storedAvatar = profile?.avatar_url?.trim();
  if (storedAvatar) {
    return storedAvatar;
  }
  return getOAuthAvatarUrl(user);
}

export function resolveAvatarInitial(user: User): string {
  const emailPrefix = user.email?.split("@")[0]?.trim();
  const firstCharacter = emailPrefix?.charAt(0).toUpperCase();
  return firstCharacter || "U";
}

export function toResolvedUserProfile(
  profile: UserProfileRow | null,
  user: User,
): ResolvedUserProfile {
  return {
    displayName: resolveDisplayName(profile, user),
    avatarUrl: resolveAvatarUrl(profile, user),
    avatarInitial: resolveAvatarInitial(user),
    nickname: profile?.nickname?.trim() || null,
  };
}
