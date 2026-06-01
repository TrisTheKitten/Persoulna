"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useVault } from "@/src/context/VaultContext";
import {
  EMPTY_LOCAL_APP_DATA,
  loadLocalAppData,
  saveLocalAppData,
  type LocalAppData,
} from "@/src/lib/local-app-data";
import { saveUserProfileAction } from "../profile/actions";
import LoadingButton from "../LoadingButton";
import { AppNotice } from "../AppNotice";
import UserAvatar from "../UserAvatar";
import {
  NICKNAME_MAX_LENGTH,
  type ResolvedUserProfile,
} from "@/src/lib/profile-shared";

const PERSONALITY_MAX_WORDS = 300;

function limitWords(text: string, max: number): string {
  const words = text.trim() ? text.split(/\s+/) : [];
  return words.slice(0, max).join(" ");
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  x: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  "linkedin-page": (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  threads: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.803-1.79-.128 2.754-1.19 5.072-3.988 5.072-.037 0-.075 0-.112-.002-1.588-.048-2.837-.563-3.608-1.502-.658-.804-.992-1.867-.953-3.047.08-2.42 1.652-4.098 3.92-4.216 1.09-.056 2.12.248 2.927.882.663.52 1.137 1.225 1.388 2.043.158-.392.276-.805.348-1.237.34-2.055-.14-3.65-1.396-4.685-1.068-.88-2.639-1.293-4.566-1.22-2.38.09-4.145.846-5.245 2.237-.87 1.1-1.325 2.6-1.353 4.458v.057c.028 1.859.483 3.358 1.353 4.458 1.1 1.391 2.865 2.148 5.245 2.237 1.072-.032 2.076-.2 2.994-.5 1.613-.525 2.95-1.452 3.965-2.745 1.19-1.506 1.892-3.378 2.076-5.568l.022-.252c.565.346.981.793 1.232 1.327.735 1.562.597 4.274-1.497 6.328-1.847 1.81-4.12 2.677-7.342 2.697zM10.684 15.59c-.04 1.18.42 2.178 1.318 2.753.75.483 1.73.65 2.872.487 1.82-.26 2.88-1.463 2.848-2.86-.017-.738-.29-1.358-.787-1.794-.538-.472-1.302-.76-2.217-.826-1.316-.095-2.293.52-2.718 1.567l-.204.498-.212-.175c-.326-.267-.507-.605-.539-.987-.06-.71.38-1.35 1.156-1.661a3.27 3.27 0 01.762-.212c-.478-.716-1.28-1.082-2.33-1.055-1.587.04-2.58.87-2.632 2.422z" />
    </svg>
  ),
  medium: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  "instagram-standalone": (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  ),
};
const REFERENCE_FILE_ACCEPT = ".txt,text/plain";
const REFERENCE_MAX_BYTES = 1_000_000;
const REFERENCE_MAX_FILES = 5;
const READABLE_VAULT_STATUSES = new Set(["connected", "failed"]);
const AVATAR_FILE_ACCEPT = "image/jpeg,image/png,image/webp";
const AVATAR_FILE_HINT = "JPG, PNG, WebP";

type Integration = {
  postizIntegrationId: string;
  identifier: string;
  name: string;
  profile: string | null;
  disabled: boolean;
};

type Props = {
  saveAction: (formData: FormData) => Promise<void>;
  syncAction: () => Promise<void>;
  initialPersona: string;
  userId: string;
  userProfile: ResolvedUserProfile;
  integrations: Integration[];
  platformLabels: Record<string, string>;
  errorMessage: string | null;
  successMessage: boolean;
};

export default function SettingsForm({
  saveAction,
  syncAction,
  initialPersona,
  userId,
  userProfile,
  integrations,
  platformLabels,
  errorMessage,
  successMessage,
}: Props) {
  const fileInputId = useId();
  const nicknameInputId = useId();
  const avatarInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const { vaultStatus, credentials, passphrase, unlock, save, lock, reset } = useVault();
  const [localData, setLocalData] = useState<LocalAppData>(EMPTY_LOCAL_APP_DATA);

  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [vaultConfirmPassphrase, setVaultConfirmPassphrase] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModelName, setGeminiModelName] = useState("");
  const [postizBaseUrl, setPostizBaseUrl] = useState("");
  const [postizFrontendUrl, setPostizFrontendUrl] = useState("");
  const [postizApiKey, setPostizApiKey] = useState("");
  const [postizClientId, setPostizClientId] = useState("");
  const [postizClientSecret, setPostizClientSecret] = useState("");

  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const [persona, setPersona] = useState(
    limitWords(initialPersona, PERSONALITY_MAX_WORDS),
  );
  const canReadLocalData = READABLE_VAULT_STATUSES.has(vaultStatus);
  const localIntegrations = localData.postiz_integrations.length > 0
    ? localData.postiz_integrations
    : integrations;

  useEffect(() => {
    if (!passphrase || vaultStatus === "missing" || vaultStatus === "locked") return;
    let cancelled = false;
    loadLocalAppData(userId, passphrase)
      .then((loaded) => {
        if (cancelled) return;
        setLocalData(loaded);
        setPersona(limitWords(loaded.active_persona_summary?.main_topics ?? initialPersona, PERSONALITY_MAX_WORDS));
      })
      .catch((error) => {
        if (!cancelled) {
          setVaultError(error instanceof Error ? error.message : "Failed to load local data");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialPersona, passphrase, userId, vaultStatus]);

  const persistLocalData = async (nextData: LocalAppData) => {
    if (!passphrase) {
      throw new Error("Unlock the vault before saving local data.");
    }
    await saveLocalAppData(userId, passphrase, nextData);
    setLocalData(nextData);
  };

  const getVaultHeaders = () => {
    const headers: Record<string, string> = {};
    if (credentials?.geminiApiKey) {
      headers["x-vault-gemini-api-key"] = credentials.geminiApiKey;
    }
    if (credentials?.geminiModelName) {
      headers["x-vault-gemini-model-name"] = credentials.geminiModelName;
    }
    const token = credentials?.postizApiKey || credentials?.postizOAuthAccessToken;
    if (token) {
      headers["x-vault-postiz-token"] = token;
    }
    if (credentials?.postizBaseUrl) {
      headers["x-vault-postiz-url"] = credentials.postizBaseUrl;
    }
    return headers;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (credentials) {
        setGeminiApiKey(credentials.geminiApiKey || "");
        setGeminiModelName(credentials.geminiModelName || "");
        setPostizBaseUrl(credentials.postizBaseUrl || "https://api.postiz.com/public/v1");
        setPostizFrontendUrl(credentials.postizFrontendUrl || "https://app.postiz.com");
        setPostizApiKey(credentials.postizApiKey || "");
        setPostizClientId(credentials.postizOAuthClientId || "");
        setPostizClientSecret(credentials.postizOAuthClientSecret || "");
      } else {
        setGeminiApiKey("");
        setGeminiModelName("");
        setPostizBaseUrl("https://api.postiz.com/public/v1");
        setPostizFrontendUrl("https://app.postiz.com");
        setPostizApiKey("");
        setPostizClientId("");
        setPostizClientSecret("");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [credentials]);

  useEffect(() => {
    const oauthParam = searchParams.get("oauth");
    if (oauthParam === "callback") {
      if (vaultStatus === "connected" || vaultStatus === "failed") {
        const exchangeToken = async () => {
          setVaultLoading(true);
          setVaultError(null);
          try {
            const res = await fetch("/api/postiz/oauth/exchange", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                client_id: credentials?.postizOAuthClientId || postizClientId,
                client_secret: credentials?.postizOAuthClientSecret || postizClientSecret,
                backend_url: credentials?.postizBaseUrl || postizBaseUrl,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Token exchange failed");
            }
            if (data.access_token) {
              const updated = {
                ...credentials,
                postizOAuthAccessToken: data.access_token,
                geminiApiKey,
                geminiModelName,
                postizBaseUrl,
                postizFrontendUrl,
                postizApiKey,
                postizOAuthClientId: postizClientId,
                postizOAuthClientSecret: postizClientSecret,
              };
              await save(updated);
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete("oauth");
              window.history.replaceState({}, "", newUrl.toString());
            }
          } catch (err: any) {
            setVaultError(err.message || "Failed to exchange OAuth token");
          } finally {
            setVaultLoading(false);
          }
        };
        const timer = setTimeout(() => {
          exchangeToken();
        }, 0);
        return () => clearTimeout(timer);
      } else if (vaultStatus === "locked" || vaultStatus === "missing") {
        const timer = setTimeout(() => {
          setVaultError("Please unlock/set up your vault to finish Postiz OAuth configuration.");
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [
    searchParams,
    vaultStatus,
    credentials,
    postizClientId,
    postizClientSecret,
    postizBaseUrl,
    geminiApiKey,
    geminiModelName,
    postizApiKey,
    postizFrontendUrl,
    save
  ]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultLoading(true);
    setVaultError(null);
    try {
      const creds = {
        geminiApiKey,
        geminiModelName,
        postizBaseUrl,
        postizFrontendUrl,
        postizApiKey,
        postizOAuthClientId: postizClientId,
        postizOAuthClientSecret: postizClientSecret,
        postizOAuthAccessToken: credentials?.postizOAuthAccessToken,
      };
      await save(creds);
    } catch (err: any) {
      setVaultError(err.message || "Failed to save credentials");
    } finally {
      setVaultLoading(false);
    }
  };

  const handleStartOAuth = async () => {
    if (!postizClientId || !postizFrontendUrl) {
      setVaultError("Postiz Client ID and Frontend URL are required for OAuth");
      return;
    }
    setVaultLoading(true);
    try {
      const creds = {
        geminiApiKey,
        geminiModelName,
        postizBaseUrl,
        postizFrontendUrl,
        postizApiKey,
        postizOAuthClientId: postizClientId,
        postizOAuthClientSecret: postizClientSecret,
        postizOAuthAccessToken: credentials?.postizOAuthAccessToken,
      };
      await save(creds);
      window.location.href = `/api/postiz/oauth/start?client_id=${encodeURIComponent(postizClientId)}&frontend_url=${encodeURIComponent(postizFrontendUrl)}`;
    } catch (err: any) {
      setVaultError(err.message || "Failed to save credentials before starting OAuth");
      setVaultLoading(false);
    }
  };

  const handleLinkChannel = async (platform: string) => {
    setVaultLoading(true);
    setVaultError(null);
    try {
      const headers = getVaultHeaders();
      const res = await fetch("/api/postiz/social/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          integration: platform,
          return_url: window.location.origin + "/settings",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to connect to ${platform}`);
      }
      if (data.url) {
        window.location.assign(data.url);
      } else {
        throw new Error("No URL returned from connection endpoint");
      }
    } catch (err: any) {
      setVaultError(err.message || `Failed to link ${platform}`);
      setVaultLoading(false);
    }
  };

  const onSyncClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (vaultStatus !== "connected" && vaultStatus !== "failed") {
      setVaultError("Unlock the vault before syncing channels.");
      return;
    }
      setVaultLoading(true);
      setVaultError(null);
      try {
        const headers = getVaultHeaders();
        const res = await fetch("/api/vault/sync", {
          method: "POST",
          headers,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Sync failed");
        }
        await persistLocalData({
          ...localData,
          postiz_integrations: data.integrations ?? [],
        });
        router.refresh();
      } catch (err: any) {
        setVaultError(err.message || "Failed to sync channels");
      } finally {
        setVaultLoading(false);
      }
  };

  const onSaveClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (vaultStatus !== "connected" && vaultStatus !== "failed") {
      setVaultError("Unlock the vault before saving.");
      return;
    }
      setVaultLoading(true);
      setVaultError(null);
      try {
        const headers = getVaultHeaders();
        const form = e.currentTarget.form;
        if (!form) return;
        const formData = new FormData(form);
        formData.set(
          "current_persona_json",
          JSON.stringify(localData.active_persona_summary),
        );
        formData.set(
          "current_writing_examples_json",
          JSON.stringify(localData.writing_examples),
        );
        const res = await fetch("/api/vault/settings", {
          method: "POST",
          headers,
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to save settings");
        }
        await persistLocalData({
          ...localData,
          active_persona_summary: data.activePersona,
          writing_examples: data.writingExamples,
        });
        router.push("/settings?success=true");
        router.refresh();
      } catch (err: any) {
        setVaultError(err.message || "Failed to save settings");
      } finally {
        setVaultLoading(false);
      }
  };
  const [referenceNames, setReferenceNames] = useState<string[]>([]);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [avatarFileName, setAvatarFileName] = useState("");

  const handleSaveNickname = async () => {
    setNicknameSaving(true);
    try {
      const formData = new FormData();
      formData.set("nickname", nicknameInputRef.current?.value ?? "");
      const avatarFile = avatarInputRef.current?.files?.[0];
      if (avatarFile) {
        formData.set("avatar", avatarFile);
      }
      await saveUserProfileAction(formData);
    } finally {
      setNicknameSaving(false);
    }
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAvatarFileName(event.target.files?.[0]?.name ?? "");
  };

  useEffect(() => {
    if (errorMessage || successMessage) {
      const id = window.setTimeout(() => {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("error");
          url.searchParams.delete("success");
          window.history.replaceState({}, "", url.toString());
        }
      }, 6000);
      return () => window.clearTimeout(id);
    }
  }, [errorMessage, successMessage]);

  const handleReferenceChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      setReferenceNames([]);
      return;
    }

    if (files.length > REFERENCE_MAX_FILES) {
      setReferenceError(`Choose up to ${REFERENCE_MAX_FILES} files.`);
      setReferenceNames([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (files.some((file) => !file.name.toLowerCase().endsWith(".txt"))) {
      setReferenceError("Only .txt files are supported.");
      setReferenceNames([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (files.some((file) => file.size > REFERENCE_MAX_BYTES)) {
      setReferenceError("Each file must be 1 MB or smaller.");
      setReferenceNames([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setReferenceNames(files.map((file) => file.name));
    setReferenceError(null);
  };

  const personaCount = wordCount(persona);

  return (
    <form action={saveAction} className="settingsStack">
      {errorMessage && (
        <AppNotice variant="error" title="Could not save">
          {errorMessage}
        </AppNotice>
      )}
      {successMessage && (
        <AppNotice variant="success" title="Saved" />
      )}

      <article className="settingsCard profileCard">
        <div className="profileHero">
          <UserAvatar
            src={userProfile.avatarUrl}
            initial={userProfile.avatarInitial}
            className="profileHeroAvatar"
            alt=""
          />
          <div className="profileHeroBody">
            <h2 className="profileHeroTitle">Profile</h2>
            <p className="profileHeroLead">
              Your display name and connected channels.
            </p>
          </div>
          <button
            type="button"
            className="connectionsBtn profileConnectionsBtn"
            onClick={() => setConnectionsOpen((open) => !open)}
            aria-expanded={connectionsOpen}
          >
            Connections
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`chev ${connectionsOpen ? "chevOpen" : ""}`}
              aria-hidden
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="profileNicknameSection">
          <div className="field profileAvatarField">
            <label htmlFor={avatarInputId}>Avatar</label>
            <div className="profileAvatarRow">
              <input
                ref={avatarInputRef}
                id={avatarInputId}
                name="avatar"
                type="file"
                accept={AVATAR_FILE_ACCEPT}
                onChange={handleAvatarChange}
                className="visuallyHidden profileAvatarInput"
              />
              <label className="profileAvatarPicker" htmlFor={avatarInputId}>
                <span className="profileAvatarPickerIcon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <span className="profileAvatarPickerText">Upload Photo</span>
              </label>
              <span className="profileAvatarFile">
                {avatarFileName || AVATAR_FILE_HINT}
              </span>
            </div>
          </div>
          <div className="field profileNicknameField">
            <label htmlFor={nicknameInputId}>Nickname</label>
            <div className="profileNicknameRow">
              <input
                ref={nicknameInputRef}
                id={nicknameInputId}
                name="nickname"
                type="text"
                maxLength={NICKNAME_MAX_LENGTH}
                defaultValue={userProfile.nickname ?? ""}
                placeholder={userProfile.displayName}
                autoComplete="nickname"
              />
              <LoadingButton
                type="button"
                className="generateBtn profileSaveBtn"
                loadingLabel="Saving"
                loading={nicknameSaving}
                onClick={handleSaveNickname}
              >
                Save Profile
              </LoadingButton>
            </div>
          </div>
          <p className="profileNicknameHint">
            Shown across the app. Leave nickname blank to use your sign-in name.
          </p>
        </div>

        {connectionsOpen && (
          <div className="connectionsPanel">
            <div className="connectionsChannels">
              <div className="connectionsChannelsHead">
                <h3>Channels</h3>
                <LoadingButton
                  type="submit"
                  className="syncBtn"
                  formAction={syncAction}
                  onClick={onSyncClick}
                  loading={vaultLoading && vaultStatus === "connected"}
                  loadingLabel="Syncing"
                >
                  Sync
                </LoadingButton>
              </div>
              <p className="muted" style={{ fontSize: "0.75rem", marginBottom: "12px", marginTop: "-4px" }}>
                Add your social media channels directly inside your Postiz Cloud dashboard, then click Sync to load them here.
              </p>
              {localIntegrations.length > 0 ? (
                <ul className="channelList">
                  {localIntegrations.map((integration) => (
                    <li
                      key={integration.postizIntegrationId}
                      className="channelRow"
                    >
                      <div>
                        <p className="channelLabel">
                          {PLATFORM_ICONS[integration.identifier]}
                          {platformLabels[integration.identifier] ??
                            integration.identifier}
                        </p>
                        <p className="channelMeta">
                          {integration.profile ?? integration.name}
                        </p>
                      </div>
                      <span
                        className={`channelStatus ${integration.disabled ? "off" : "on"}`}
                        title={integration.disabled ? "Disabled" : "Connected"}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No channels synced yet.</p>
              )}
              {vaultStatus === "connected" && (
                <div className="linkChannelsSection" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--line-soft)" }}>
                  <h4 className="eyebrow" style={{ marginBottom: "8px" }}>Link Channels</h4>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {["x", "linkedin", "threads", "medium"].map((plat) => (
                      <button
                        key={plat}
                        type="button"
                        className="chooseFileBtn"
                        style={{ margin: 0, padding: "6px 12px", fontSize: "0.8125rem", textTransform: "capitalize" }}
                        onClick={() => handleLinkChannel(plat)}
                        disabled={vaultLoading}
                      >
                        Link {plat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </article>

      <article className="settingsCard">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="cardTitle">Encrypted Credential Vault</h2>
            <p className="cardLead" style={{ marginTop: "4px" }}>
              Securely store your API keys locally using browser-side AES-GCM encryption.
            </p>
          </div>
          <div>
            {vaultStatus === "connected" && <span className="channelStatus on" title="Connected" style={{ display: "inline-block", position: "static" }} />}
            {vaultStatus === "failed" && <span className="channelStatus off" title="Failed" style={{ display: "inline-block", position: "static" }} />}
          </div>
        </div>

        {vaultError && (
          <AppNotice variant="error" title="Vault error" className="noticeFlush">
            {vaultError}
          </AppNotice>
        )}

        {vaultStatus === "missing" && (
          <div className="settingsStack" style={{ gap: "12px" }}>
            <p className="muted">
              Choose a secure passphrase to create your local browser vault. Plain API keys will not be saved on the server.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="field">
                <span>Passphrase</span>
                <input
                  type="password"
                  value={vaultPassphrase}
                  onChange={(e) => setVaultPassphrase(e.target.value)}
                  placeholder="Enter a secure passphrase"
                />
              </div>
              <div className="field">
                <span>Confirm Passphrase</span>
                <input
                  type="password"
                  value={vaultConfirmPassphrase}
                  onChange={(e) => setVaultConfirmPassphrase(e.target.value)}
                  placeholder="Confirm passphrase"
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="generateBtn"
                onClick={async () => {
                  if (!vaultPassphrase) {
                    setVaultError("Passphrase is required");
                    return;
                  }
                  if (vaultPassphrase !== vaultConfirmPassphrase) {
                    setVaultError("Passphrases do not match");
                    return;
                  }
                  setVaultLoading(true);
                  setVaultError(null);
                  try {
                    await save({}, vaultPassphrase);
                  } catch (err: any) {
                    setVaultError(err.message || "Failed to initialize vault");
                  } finally {
                    setVaultLoading(false);
                  }
                }}
                disabled={vaultLoading}
              >
                {vaultLoading ? "Initializing..." : "Create Vault"}
              </button>
            </div>
          </div>
        )}

        {vaultStatus === "locked" && (
          <div className="settingsStack" style={{ gap: "12px" }}>
            <p className="muted">
              Your credentials vault is locked. Enter your passphrase to unlock and decrypt your keys.
            </p>
            <div className="field">
              <span>Passphrase</span>
              <input
                type="password"
                value={vaultPassphrase}
                onChange={(e) => setVaultPassphrase(e.target.value)}
                placeholder="Enter passphrase to unlock"
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!vaultPassphrase) {
                      setVaultError("Passphrase is required");
                      return;
                    }
                    setVaultLoading(true);
                    setVaultError(null);
                    try {
                      await unlock(vaultPassphrase);
                      setVaultPassphrase("");
                    } catch (err: any) {
                      setVaultError("Invalid passphrase or corrupted vault.");
                    } finally {
                      setVaultLoading(false);
                    }
                  }
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <button
                type="button"
                className="chooseFileBtn"
                style={{ color: "var(--danger)" }}
                onClick={() => {
                  if (confirm("Are you sure you want to reset your vault? This will permanently delete all stored credentials.")) {
                    reset();
                  }
                }}
                disabled={vaultLoading}
              >
                Reset Vault
              </button>
              <button
                type="button"
                className="generateBtn"
                onClick={async () => {
                  if (!vaultPassphrase) {
                    setVaultError("Passphrase is required");
                    return;
                  }
                  setVaultLoading(true);
                  setVaultError(null);
                  try {
                    await unlock(vaultPassphrase);
                    setVaultPassphrase("");
                  } catch (err: any) {
                    setVaultError("Invalid passphrase or corrupted vault.");
                  } finally {
                    setVaultLoading(false);
                  }
                }}
                disabled={vaultLoading}
              >
                {vaultLoading ? "Unlocking..." : "Unlock"}
              </button>
            </div>
          </div>
        )}

        {(vaultStatus === "connected" || vaultStatus === "failed") && (
          <div className="settingsStack" style={{ gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: vaultStatus === "connected" ? "var(--ok)" : "var(--danger)" }}>
                {vaultStatus === "connected" ? "Vault Unlocked & Connected" : "Connection Failed - Check Keys"}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="chooseFileBtn"
                  style={{ margin: 0 }}
                  onClick={() => lock()}
                  disabled={vaultLoading}
                >
                  Lock
                </button>
                <button
                  type="button"
                  className="chooseFileBtn"
                  style={{ color: "var(--danger)", margin: 0 }}
                  onClick={() => {
                    if (confirm("Are you sure you want to reset your vault? This will permanently delete all stored credentials.")) {
                      reset();
                    }
                  }}
                  disabled={vaultLoading}
                >
                  Reset
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="field">
                <span>Gemini API Key</span>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIza..."
                />
              </div>
              <div className="field">
                <span>Gemini Model Name</span>
                <input
                  type="text"
                  value={geminiModelName}
                  onChange={(e) => setGeminiModelName(e.target.value)}
                  placeholder="gemini-2.5-flash"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="field">
                <span>Postiz API Key</span>
                <input
                  type="password"
                  value={postizApiKey}
                  onChange={(e) => setPostizApiKey(e.target.value)}
                  placeholder="Enter Postiz API Key"
                />
                <p className="muted" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                  Your Postiz Cloud Public API key. Do not configure Client ID/Secret or Access Tokens if using Postiz Cloud.
                </p>
              </div>
              <div className="field" />
            </div>

            <details className="advancedDetails">
              <summary className="advancedSummary">
                Self-Hosted & OAuth Configuration (Advanced)
              </summary>
              <div className="advancedContent">
                <p className="muted" style={{ fontSize: "0.75rem", marginBottom: "16px" }}>
                  These options are only for self-hosted instances of Postiz or custom OAuth client setups. For Postiz Cloud, you only need to enter your API key above.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="field">
                    <span>Postiz API URL</span>
                    <input
                      type="text"
                      value={postizBaseUrl}
                      onChange={(e) => setPostizBaseUrl(e.target.value)}
                      placeholder="https://api.postiz.com/public/v1"
                    />
                  </div>
                  <div className="field">
                    <span>Postiz Frontend URL</span>
                    <input
                      type="text"
                      value={postizFrontendUrl}
                      onChange={(e) => setPostizFrontendUrl(e.target.value)}
                      placeholder="https://app.postiz.com"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="field">
                    <span>Postiz Access Token (read-only)</span>
                    <input
                      type="text"
                      value={credentials?.postizOAuthAccessToken || ""}
                      disabled
                      placeholder="Not linked via OAuth yet"
                      style={{ backgroundColor: "var(--surface-muted)", color: "var(--muted)" }}
                    />
                  </div>
                  <div className="field" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="field">
                    <span>Postiz Client ID (OAuth)</span>
                    <input
                      type="text"
                      value={postizClientId}
                      onChange={(e) => setPostizClientId(e.target.value)}
                      placeholder="Enter Client ID for OAuth"
                    />
                  </div>
                  <div className="field">
                    <span>Postiz Client Secret (OAuth)</span>
                    <input
                      type="password"
                      value={postizClientSecret}
                      onChange={(e) => setPostizClientSecret(e.target.value)}
                      placeholder="Enter Client Secret for OAuth"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <button
                    type="button"
                    className="chooseFileBtn"
                    onClick={handleStartOAuth}
                    disabled={vaultLoading || !postizClientId || !postizFrontendUrl}
                    style={{ margin: 0 }}
                  >
                    Connect Postiz via OAuth
                  </button>
                </div>
              </div>
            </details>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="generateBtn"
                onClick={handleSaveCredentials}
                disabled={vaultLoading}
              >
                {vaultLoading ? "Testing & Saving..." : "Save Vault Credentials"}
              </button>
            </div>
          </div>
        )}
      </article>

      {canReadLocalData && (
        <div className="settingsRow">
          <article className="settingsCard">
            <h2 className="cardTitle">Personality</h2>
            <div className="personalityField">
              <textarea
                name="persona"
                value={persona}
                onChange={(e) =>
                  setPersona(limitWords(e.target.value, PERSONALITY_MAX_WORDS))
                }
                placeholder="Describe how you write, what you care about, and the tone you want."
                rows={4}
              />
              <span className="charCounter">
                {personaCount}/{PERSONALITY_MAX_WORDS}
              </span>
            </div>
          </article>

          <article className="settingsCard">
            <h2 className="cardTitle">References</h2>
            <div className="dropZone">
              <div className="dropIcon">
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="dropTitle">Upload text file</p>
              <p className="dropHint">
                Upload raw writing examples, notes, or brand text.
              </p>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                name="writing_examples"
                accept={REFERENCE_FILE_ACCEPT}
                multiple
                onChange={handleReferenceChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="chooseFileBtn"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Choose File
              </button>
              {referenceNames.length > 0 && (
                <p className="dropFileName">
                  Selected: {referenceNames.join(", ")}
                </p>
              )}
              {referenceError && (
                <p className="dropFileError">{referenceError}</p>
              )}
            </div>
          </article>
        </div>
      )}

      {canReadLocalData && (
        <>
          <div
            className="mobileFixedBottomReserve mobileFixedBottomReserve--save"
            aria-hidden="true"
          />

          <div className="saveBar">
            <LoadingButton
              type="submit"
              className="saveBtn"
              formAction={saveAction}
              onClick={onSaveClick}
              loading={vaultLoading}
              loadingLabel="Saving"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              }
            >
              Save
            </LoadingButton>
          </div>
        </>
      )}
    </form>
  );
}
