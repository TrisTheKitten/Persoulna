"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/src/context/VaultContext";
import {
  EMPTY_LOCAL_APP_DATA,
  loadLocalAppData,
  mergeDashboardData,
  saveLocalAppData,
  type LocalAppData,
} from "@/src/lib/local-app-data";
import {
  generateFromCommandAction,
  scheduleContentBatchAction,
  schedulePlatformBatchAction,
} from "./actions";
import ImagePicker from "./ImagePicker";
import Header from "./Header";
import DraftsCarousel from "./DraftsCarousel";
import LoadingButton from "./LoadingButton";
import LoadingSkeleton from "./LoadingSkeleton";
import { AppNotice } from "./AppNotice";

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
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
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

const ThreadsIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12.5 2C6.977 2 2.5 6.477 2.5 12s4.477 10 10 10c2.584 0 4.908-.98 6.663-2.583a1 1 0 1 0-1.326-1.498A7.973 7.973 0 0 1 12.5 20c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8c0 1.933-.567 3.5-1.5 3.5-.478 0-.85-.246-.98-.679a4.996 4.996 0 0 0-4.02 1.679A2.993 2.993 0 0 1 12.5 17c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5c0 3.038-1.567 5.5-3.5 5.5-1.127 0-2.072-.619-2.52-1.52A4.975 4.975 0 0 1 7.5 12c0-2.757 2.243-5 5-5s5 2.243 5 5a2.991 2.991 0 0 1-5 2.22A1 1 0 1 0 11.22 15.8 4.978 4.978 0 0 0 12.5 16c2.757 0 5-2.243 5-5 0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5z" />
  </svg>
);

const MediumIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42zM24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const GenericIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const UI_HIDDEN_BLOCKERS = new Set([
  "no_supported_platform_connected",
  "no_draft_generated",
  "no_insight_digest",
]);

const BLOCKER_TEXT: Record<string, string> = {
  missing_postiz_api_key: "Postiz API key is missing. Add POSTIZ_API_KEY in your environment.",
  postiz_connection_failed: "Postiz connection failed. Check your API key.",
  no_postiz_integrations: "No Postiz channels connected. Connect at least one channel in Postiz.",
  missing_active_persona: "Set an active persona in Settings before generating drafts.",
};

const READABLE_VAULT_STATUSES = new Set(["connected", "failed"]);

const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  linkedin_page: "LinkedIn Page",
  threads: "Threads",
  medium: "Medium",
  facebook: "Facebook",
  instagram: "Instagram",
  instagram_standalone: "Instagram",
  telegram: "Telegram",
};

function getPlatformLabel(identifier: string, name?: string) {
  if (PLATFORM_LABELS[identifier]) {
    return PLATFORM_LABELS[identifier];
  }
  if (name) {
    return name;
  }
  return identifier
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBlocker(blocker: string) {
  return BLOCKER_TEXT[blocker] ?? blocker;
}

type HomeClientProps = {
  data: any;
  error?: string | string[] | undefined;
};

export default function HomeClient({ data, error }: HomeClientProps) {
  const router = useRouter();
  const { vaultStatus, isInitializing, credentials, passphrase } = useVault();
  const [localData, setLocalData] = useState<LocalAppData>(EMPTY_LOCAL_APP_DATA);
  const [dashboardData, setDashboardData] = useState(data);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(error ? String(error) : null);
  const [localDataLoading, setLocalDataLoading] = useState(false);

  useEffect(() => {
    if (!passphrase || vaultStatus === "missing" || vaultStatus === "locked") {
      setLocalDataLoading(false);
      return;
    }
    let cancelled = false;
    setLocalDataLoading(true);
    loadLocalAppData(data.user.id, passphrase)
      .then((loaded) => {
        if (cancelled) return;
        setLocalData(loaded);
        setDashboardData(mergeDashboardData(data, loaded));
      })
      .catch((loadError) => {
        if (!cancelled) {
          setErrorState(loadError instanceof Error ? loadError.message : "Failed to load local data");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLocalDataLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [data, passphrase, vaultStatus]);

  const persistLocalData = async (nextData: LocalAppData) => {
    if (!passphrase) {
      throw new Error("Unlock the vault before saving local data.");
    }
    await saveLocalAppData(data.user.id, passphrase, nextData);
    setLocalData(nextData);
    setDashboardData(mergeDashboardData(data, nextData));
  };

  const contentBatch = dashboardData.latest_content_batch;
  const canReadLocalData = READABLE_VAULT_STATUSES.has(vaultStatus);
  if (isInitializing || localDataLoading) {
    return <LoadingSkeleton section="write" />;
  }

  const vaultNotice = vaultStatus === "locked"
    ? "Unlock your vault in Settings to load persona, channels, and drafts."
    : vaultStatus === "missing"
      ? "Create your vault in Settings to save persona, channels, and drafts."
      : vaultStatus === "failed"
        ? "Update your vault keys in Settings before generating drafts."
        : null;

  const linkedPlatformOptions = dashboardData.postiz_integrations.filter(
    (integration: any, index: number, integrations: any[]) =>
      !integration.disabled &&
      integrations.findIndex(
        (candidate) =>
          !candidate.disabled && candidate.identifier === integration.identifier,
      ) === index,
  );

  const rawBlockers = dashboardData.readiness.blockers || [];
  const blockers = canReadLocalData
    ? rawBlockers.filter((blocker: string) => {
      if (UI_HIDDEN_BLOCKERS.has(blocker)) return false;
      if (vaultStatus !== "connected") return true;
      return (
        blocker !== "missing_postiz_api_key" &&
        blocker !== "postiz_connection_failed"
      );
    })
    : [];

  const canGenerateDrafts = vaultStatus === "connected"
    ? !blockers.includes("missing_active_persona")
    : false;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (vaultStatus === "connected") {
      e.preventDefault();
      const form = e.currentTarget;
      setLoading(true);
      setErrorState(null);
      try {
        const formData = new FormData(form);
        formData.set(
          "active_persona_md",
          localData.active_persona_summary?.persona_md ?? "",
        );
        formData.set(
          "style_rules_json",
          JSON.stringify(localData.active_persona_summary?.style_rules ?? null),
        );
        formData.set(
          "style_memory_summaries_json",
          JSON.stringify(
            localData.writing_examples
              .map((example) => example.memorySummary)
              .filter(Boolean),
          ),
        );
        formData.set("integrations_json", JSON.stringify(localData.postiz_integrations));
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

        const res = await fetch("/api/vault/generate", {
          method: "POST",
          headers,
          body: formData,
        });
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Failed to generate drafts");
        }
        await persistLocalData({
          ...localData,
          latest_content_batch: resData.contentBatch,
        });

        const textarea = form.querySelector("textarea[name='command']") as HTMLTextAreaElement | null;
        if (textarea) {
          textarea.value = "";
        }

        router.refresh();
      } catch (err: any) {
        setErrorState(err.message || "Failed to generate drafts");
        setLoading(false);
      }
    }
  };

  return (
    <main className="pageShell">
      <Header
        avatarUrl={dashboardData.user_profile?.avatarUrl}
        avatarInitial={dashboardData.user_profile?.avatarInitial}
      />

      <section className="stack composeSection" style={{ gap: "20px", marginTop: "4px" }}>
        {errorState && (
          <AppNotice variant="error" title="Error">
            {decodeURIComponent(errorState)}
          </AppNotice>
        )}

        {vaultNotice && (
          <AppNotice variant="info" title="Vault">
            {vaultNotice}
          </AppNotice>
        )}

        {blockers.length > 0 && (
          <AppNotice
            variant="warn"
            title="Blockers"
            items={blockers.map((blocker: string) => formatBlocker(blocker))}
          />
        )}

        <form className="stack" style={{ gap: "16px" }} onSubmit={handleSubmit} action={generateFromCommandAction}>
          <div className="platformTabs">
            {linkedPlatformOptions.map((integration: any) => {
              const platform = integration.identifier;
              const isX = platform === "x";
              const isInsta = platform === "instagram" || platform === "instagram_standalone";
              const isLinkedin = platform === "linkedin" || platform === "linkedin_page";
              const isThreads = platform === "threads";
              const isMedium = platform === "medium";
              const isFacebook = platform === "facebook";
              const isTelegram = platform === "telegram";

              return (
                <label className="platformTabLabel" key={integration.id}>
                  <input
                    name="platforms"
                    type="checkbox"
                    value={platform}
                    defaultChecked
                    className="platformCheckbox"
                    style={{ display: "none" }}
                  />
                  <div className="platformTab">
                    {isX && <XIcon />}
                    {isInsta && <InstagramIcon />}
                    {isLinkedin && <LinkedInIcon />}
                    {isThreads && <ThreadsIcon />}
                    {isMedium && <MediumIcon />}
                    {isFacebook && <FacebookIcon />}
                    {isTelegram && <TelegramIcon />}
                    {!isX && !isInsta && !isLinkedin && !isThreads && !isMedium && !isFacebook && !isTelegram && <GenericIcon />}
                    <span>{getPlatformLabel(platform, integration.name)}</span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="composeCard">
            <div className="composeRow">
              <ImagePicker />
              <textarea
                className="composeTextarea"
                name="command"
                placeholder="Write your post..."
                required
              />
            </div>

            <div className="composeFooter">
              <span className="composeGreeting">
                Hi, {dashboardData.user_profile?.displayName ?? "there"}
              </span>
              <LoadingButton
                type="submit"
                className="generateBtn"
                disabled={!canGenerateDrafts || loading}
                loading={loading}
                formAction={generateFromCommandAction}
                loadingLabel="Generating"
                icon={
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                }
              >
                Generate
              </LoadingButton>
            </div>
          </div>
        </form>
      </section>

      <section className="stack draftsSection" style={{ gap: "16px", marginTop: "24px" }}>
        {contentBatch ? (
          <DraftsCarousel
            contentBatch={contentBatch}
            canSchedule={dashboardData.readiness.can_schedule}
            scheduleContentBatchAction={scheduleContentBatchAction}
            schedulePlatformBatchAction={schedulePlatformBatchAction}
            localIntegrations={localData.postiz_integrations}
            onLocalContentBatchChange={async (nextContentBatch, scheduledPosts = []) => {
              await persistLocalData({
                ...localData,
                latest_content_batch: nextContentBatch,
                latest_scheduled_posts: [
                  ...scheduledPosts,
                  ...localData.latest_scheduled_posts,
                ].slice(0, 10),
              });
            }}
          />
        ) : (
          <div className="stack">
            <h2 className="draftsTitle">Drafts</h2>
            <p className="muted">No drafts yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}
