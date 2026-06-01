"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useVault } from "@/src/context/VaultContext";
import { updateDraftAction } from "./actions";
import CustomDateTimePicker from "./CustomDateTimePicker";
import LoadingButton, { LoadingMark } from "./LoadingButton";
import { AppNotice } from "./AppNotice";

type ScheduledPost = {
  id: string;
  status: string;
  postizPostId: string | null;
  scheduledAt: Date | null;
  errorMessage: string | null;
};

type Draft = {
  id: string;
  variantName: string;
  content: string;
  metadata: any;
  status: string;
  platform: string;
  format: string;
  platformBatchId: string;
  batchStatus: string;
  scheduledPost: ScheduledPost | null;
};

type Media = {
  id: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  postizMediaId: string;
  postizMediaPath: string;
  aiSummary: string;
};

type Props = {
  contentBatch: {
    id: string;
    createdAt: Date | string;
    media: Media[];
    platformBatches: {
      id: string;
      platform: string;
      format: string;
      status: string;
      drafts: {
        id: string;
        variantName: string;
        content: string;
        metadata: any;
        status: string;
        scheduledPost: ScheduledPost | null;
      }[];
    }[];
  };
  canSchedule: boolean;
  scheduleContentBatchAction: (formData: FormData) => Promise<void>;
  schedulePlatformBatchAction: (formData: FormData) => Promise<void>;
  localIntegrations?: any[];
  onLocalContentBatchChange?: (contentBatch: any, scheduledPosts?: any[]) => Promise<void>;
};

const PLATFORM_LABELS: Record<string, string> = {
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  linkedin_page: "LinkedIn Page",
  threads: "Threads",
  medium: "Medium",
  facebook: "Facebook",
  instagram: "Instagram",
  instagram_standalone: "Instagram",
  telegram: "Telegram",
};

const FORMAT_LABELS: Record<string, string> = {
  tweet: "Tweet",
  thread: "Thread",
  linkedin_post: "Post",
  threads_post: "Post",
  medium_article: "Article",
  social_post: "Post",
};

const DRAFT_SWIPE_THRESHOLD_PX = 48;

export default function DraftsCarousel({
  contentBatch,
  canSchedule,
  scheduleContentBatchAction,
  schedulePlatformBatchAction,
  localIntegrations = [],
  onLocalContentBatchChange,
}: Props) {
  const router = useRouter();
  const { vaultStatus, credentials } = useVault();
  const [activeIdx, setActiveIdx] = useState(0);
  const [postAll, setPostAll] = useState(true);
  const [editDraftId, setEditDraftId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalCanSchedule = canSchedule || (vaultStatus === "connected");

  const handleScheduleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (vaultStatus === "connected") {
      e.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const formData = new FormData(e.currentTarget);
        const contentBatchId = formData.get("content_batch_id")?.toString();
        const platformBatchId = formData.get("platform_batch_id")?.toString();
        const scheduleType = formData.get("schedule_type")?.toString();
        const scheduledAtValue = formData.get("scheduled_at")?.toString();

        const headers: Record<string, string> = {};
        const token = credentials?.postizApiKey || credentials?.postizOAuthAccessToken;
        if (token) {
          headers["x-vault-postiz-token"] = token;
        }
        if (credentials?.postizBaseUrl) {
          headers["x-vault-postiz-url"] = credentials.postizBaseUrl;
        }

        const res = await fetch("/api/vault/schedule", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            contentBatchId,
            platformBatchId,
            contentBatch,
            scheduleType,
            scheduledAt: scheduledAtValue,
            integrations: localIntegrations,
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Failed to schedule post");
        }
        if (onLocalContentBatchChange && resData.contentBatch) {
          await onLocalContentBatchChange(resData.contentBatch, resData.scheduledPosts ?? []);
        }
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Failed to schedule post");
      } finally {
        setLoading(false);
      }
    }
  };

  const pointerStartXRef = useRef<number | null>(null);

  // Flatten drafts for the carousel
  const drafts: Draft[] = React.useMemo(() => {
    return contentBatch.platformBatches.flatMap((pb) =>
      pb.drafts.map((d) => ({
        ...d,
        platform: pb.platform,
        format: pb.format,
        platformBatchId: pb.id,
        batchStatus: pb.status,
      })),
    );
  }, [contentBatch]);

  const draftCount = drafts.length;
  const activeDraftIndex = Math.min(activeIdx, Math.max(0, draftCount - 1));
  const activeDraft = drafts[activeDraftIndex];
  const isCurrentlyScheduled = postAll
    ? draftCount > 0 && drafts.every((d) => d.scheduledPost)
    : Boolean(activeDraft?.scheduledPost);

  if (!activeDraft) {
    return <p className="muted">No drafts yet.</p>;
  }

  const isMedium = activeDraft.format === "medium_article";
  const metadata = activeDraft.metadata || {};
  const isScheduled = Boolean(activeDraft.scheduledPost);
  const hasMultipleDrafts = draftCount > 1;
  const scheduleAction = postAll
    ? scheduleContentBatchAction
    : schedulePlatformBatchAction;

  const showPreviousDraft = () => {
    if (!hasMultipleDrafts) return;
    setEditDraftId(null);
    setActiveIdx((currentIdx) => {
      const currentSafeIdx = Math.min(currentIdx, draftCount - 1);
      return (currentSafeIdx + draftCount - 1) % draftCount;
    });
  };

  const showNextDraft = () => {
    if (!hasMultipleDrafts) return;
    setEditDraftId(null);
    setActiveIdx((currentIdx) => {
      const currentSafeIdx = Math.min(currentIdx, draftCount - 1);
      return (currentSafeIdx + 1) % draftCount;
    });
  };

  const handleDraftPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (editDraftId || !hasMultipleDrafts) return;
    pointerStartXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDraftPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (editDraftId || pointerStartXRef.current === null) return;
    const deltaX = pointerStartXRef.current - e.clientX;
    pointerStartXRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (Math.abs(deltaX) < DRAFT_SWIPE_THRESHOLD_PX) return;
    if (deltaX > 0) {
      showNextDraft();
    } else {
      showPreviousDraft();
    }
  };

  const handleDraftPointerCancel = () => {
    pointerStartXRef.current = null;
  };

  // Custom onSubmit for editing drafts to close edit mode instantly
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSavingDraft(true);
    try {
      if (vaultStatus === "connected" && onLocalContentBatchChange) {
        const draftId = formData.get("draft_id")?.toString();
        const content = formData.get("content")?.toString() ?? "";
        const title = formData.get("title")?.toString();
        const subtitle = formData.get("subtitle")?.toString();
        const tagsRaw = formData.get("tags")?.toString();
        const nextContentBatch = structuredClone(contentBatch);
        for (const batch of nextContentBatch.platformBatches) {
          const draft = batch.drafts.find((item: any) => item.id === draftId);
          if (!draft) continue;
          const nextMetadata = { ...(draft.metadata ?? {}) };
          if (nextMetadata.format === "medium_article") {
            if (title) nextMetadata.title = title;
            if (subtitle) nextMetadata.subtitle = subtitle;
            if (tagsRaw) {
              nextMetadata.tags = tagsRaw
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0)
                .slice(0, 4);
            }
            nextMetadata.content_markdown = content;
          }
          if (nextMetadata.format === "thread") {
            const segments = content
              .split(/\n\s*\n/)
              .map((segment) => segment.trim())
              .filter((segment) => segment.length > 0);
            if (segments.length < 2) {
              throw new Error("Thread must have at least 2 segments separated by blank lines");
            }
            nextMetadata.segments = segments;
          }
          draft.content = content;
          draft.metadata = nextMetadata;
          (draft as any).updatedAt = new Date().toISOString();
        }
        await onLocalContentBatchChange(nextContentBatch);
      } else {
        await updateDraftAction(formData);
      }
      setEditDraftId(null);
    } catch (err: any) {
      setError(err.message || "Failed to save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // SVG Icons
  const XLogo = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  const InstagramLogo = () => (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
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

  const LinkedInLogo = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );

  const ThreadsLogo = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12.5 2C6.977 2 2.5 6.477 2.5 12s4.477 10 10 10c2.584 0 4.908-.98 6.663-2.583a1 1 0 1 0-1.326-1.498A7.973 7.973 0 0 1 12.5 20c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8c0 1.933-.567 3.5-1.5 3.5-.478 0-.85-.246-.98-.679a4.996 4.996 0 0 0-4.02 1.679A2.993 2.993 0 0 1 12.5 17c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5c0 3.038-1.567 5.5-3.5 5.5-1.127 0-2.072-.619-2.52-1.52A4.975 4.975 0 0 1 7.5 12c0-2.757 2.243-5 5-5s5 2.243 5 5a2.991 2.991 0 0 1-5 2.22A1 1 0 1 0 11.22 15.8 4.978 4.978 0 0 0 12.5 16c2.757 0 5-2.243 5-5 0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5z" />
    </svg>
  );

  const MediumLogo = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42zM24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  );

  const FacebookLogo = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );

  const TelegramLogo = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );

  const GenericLogo = () => (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
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

  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case "x":
        return (
          <div className="draftPlatformIcon x">
            <XLogo />
          </div>
        );
      case "linkedin":
      case "linkedin_page":
        return (
          <div className="draftPlatformIcon linkedin">
            <LinkedInLogo />
          </div>
        );
      case "instagram":
      case "instagram_standalone":
        return (
          <div className="draftPlatformIcon instagram">
            <InstagramLogo />
          </div>
        );
      case "threads":
        return (
          <div className="draftPlatformIcon threads">
            <ThreadsLogo />
          </div>
        );
      case "medium":
        return (
          <div className="draftPlatformIcon medium">
            <MediumLogo />
          </div>
        );
      case "facebook":
        return (
          <div className="draftPlatformIcon facebook">
            <FacebookLogo />
          </div>
        );
      case "telegram":
        return (
          <div className="draftPlatformIcon telegram">
            <TelegramLogo />
          </div>
        );
      default:
        return (
          <div className="draftPlatformIcon generic">
            <GenericLogo />
          </div>
        );
    }
  };

  const getPlatformLabel = (platform: string) => {
    return PLATFORM_LABELS[platform] || platform;
  };

  const getFormatLabel = (format: string) => {
    return FORMAT_LABELS[format] || format;
  };

  // Image Grid renderer
  const renderImageGrid = (mediaList: Media[]) => {
    if (!mediaList || mediaList.length === 0) return null;
    const count = mediaList.length;
    const displayCount = Math.min(count, 4);

    return (
      <div className="draftMediaSection">
        <div className="draftMediaLabel">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>Attached Images · {count}</span>
        </div>
        <div className={`draftImageGrid grid-${displayCount}`}>
          {mediaList.slice(0, 4).map((media, index) => {
            const isLast = index === 3 && count > 4;
            return (
              <div key={media.id} className="gridImg">
                <img
                  src={media.postizMediaPath}
                  alt={media.originalName}
                  title={media.aiSummary}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const fallback =
                      target.parentElement?.querySelector(".gridImgFallback");
                    if (fallback)
                      (fallback as HTMLElement).style.display = "flex";
                  }}
                />
                <div className="gridImgFallback" style={{ display: "none" }}>
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>{media.originalName}</span>
                </div>
                {isLast && <div className="gridImgOverlay">+{count - 3}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="stack">
      {/* Drafts Title & Post All Toggle */}
      <div className="draftsSectionHeader">
        <h2 className="draftsTitle">Drafts</h2>
        <label className="postAllContainer">
          <span>Post All</span>
          <label className="toggleSwitch">
            <input
              type="checkbox"
              checked={postAll}
              onChange={(e) => setPostAll(e.target.checked)}
            />
            <span className="toggleSlider"></span>
          </label>
        </label>
      </div>

      {/* Main Active Card */}
      <article
        className="draftsCard"
        onPointerDown={handleDraftPointerDown}
        onPointerUp={handleDraftPointerUp}
        onPointerCancel={handleDraftPointerCancel}
      >
        {/* Card Header */}
        <div className="draftCardHeader">
          <div className="draftProfileBlock">
            {renderPlatformIcon(activeDraft.platform)}
            <div className="draftPlatformInfo">
              <span className="draftPlatformName">
                {getPlatformLabel(activeDraft.platform)}
              </span>
              <span className="draftPlatformSubtitle">
                {getFormatLabel(activeDraft.format)}
              </span>
            </div>
          </div>

          {!isScheduled && editDraftId !== activeDraft.id && (
            <button
              type="button"
              className="editDraftBtn"
              onClick={() => setEditDraftId(activeDraft.id)}
              aria-label="Edit draft"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          )}
        </div>

        {/* Content Section / Form */}
        {editDraftId === activeDraft.id ? (
          <form
            className="editDraftForm"
            onSubmit={handleEditSubmit}
            aria-busy={isSavingDraft}
          >
            <input type="hidden" name="draft_id" value={activeDraft.id} />

            {isMedium && (
              <>
                <label className="editField">
                  <span>Title</span>
                  <input
                    name="title"
                    defaultValue={metadata.title ?? ""}
                    required
                  />
                </label>
                <label className="editField">
                  <span>Subtitle</span>
                  <input
                    name="subtitle"
                    defaultValue={metadata.subtitle ?? ""}
                    required
                  />
                </label>
                <label className="editField">
                  <span>Tags (comma separated, up to 4)</span>
                  <input
                    name="tags"
                    defaultValue={(metadata.tags ?? []).join(", ")}
                  />
                </label>
              </>
            )}

            <label className="editField">
              <span>{isMedium ? "Markdown Body" : "Content"}</span>
              <textarea
                name="content"
                rows={isMedium ? 12 : 6}
                defaultValue={activeDraft.content}
                required
              />
            </label>

            <div className="editFormActions">
              <button
                type="button"
                className="editCancelBtn"
                onClick={() => setEditDraftId(null)}
                disabled={isSavingDraft}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`editSaveBtn${isSavingDraft ? " isLoading" : ""}`}
                disabled={isSavingDraft}
                aria-busy={isSavingDraft}
              >
                {isSavingDraft && <LoadingMark />}
                <span>{isSavingDraft ? "Saving" : "Save"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="stack" style={{ gap: "16px" }}>
            {isMedium && (
              <div
                className="mediumArticleMeta"
                style={{
                  borderBottom: "1px solid var(--line-soft)",
                  paddingBottom: "12px",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.25rem",
                    marginBottom: "4px",
                    fontWeight: "700",
                  }}
                >
                  {metadata.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    marginBottom: "8px",
                  }}
                >
                  {metadata.subtitle}
                </p>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(metadata.tags ?? []).map((tag: string) => (
                    <span
                      key={tag}
                      className="pickerFileChip"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="draftBodyContent">{activeDraft.content}</p>

            {/* Attached images preview */}
            {renderImageGrid(contentBatch.media)}
          </div>
        )}

        {/* Published / Scheduled status */}
        {activeDraft.scheduledPost && (
          <div className={
            activeDraft.scheduledPost.status === "failed"
              ? "publishedBadge publishedBadgeFailed"
              : "publishedBadge"
          }>
            {activeDraft.scheduledPost.status === "failed" ? (
              <svg className="publishedBadgeIcon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg className="publishedBadgeIcon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            <span className="publishedBadgeText">
              {activeDraft.scheduledPost.status === "failed"
                ? "Failed"
                : "Published"}
            </span>
            <span className="publishedBadgeTime">
              {activeDraft.scheduledPost.scheduledAt
                ? new Date(
                    activeDraft.scheduledPost.scheduledAt,
                  ).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Just now"}
            </span>
            {activeDraft.scheduledPost.errorMessage && (
              <span className="publishedBadgeError">
                {activeDraft.scheduledPost.errorMessage}
              </span>
            )}
          </div>
        )}
      </article>

      {hasMultipleDrafts && (
        <div className="carouselDots" role="tablist" aria-label="Draft pages">
          {drafts.map((draft, index) => (
            <button
              key={draft.id}
              type="button"
              role="tab"
              className={`dot${index === activeDraftIndex ? " active" : ""}`}
              aria-label={`Draft ${index + 1} of ${draftCount}`}
              aria-selected={index === activeDraftIndex}
              onClick={() => {
                setEditDraftId(null);
                setActiveIdx(index);
              }}
            />
          ))}
        </div>
      )}

      {hasMultipleDrafts && (
        <div className="draftPreviewControls">
          <button
            type="button"
            className="draftArrowBtn"
            onClick={showPreviousDraft}
            aria-label="Previous draft"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="draftPreviewHint">Swipe drafts</span>
          <span className="draftPreviewCount">
            {activeDraftIndex + 1} / {draftCount}
          </span>
          <button
            type="button"
            className="draftArrowBtn"
            onClick={showNextDraft}
            aria-label="Next draft"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <AppNotice variant="error" title="Post failed" className="noticeInset">
          {error}
        </AppNotice>
      )}

      <div className="mobileFixedBottomReserve" aria-hidden="true" />

      <form onSubmit={handleScheduleSubmit} action={scheduleAction} className="bottomActionBar">
        {postAll ? (
          <input
            type="hidden"
            name="content_batch_id"
            value={contentBatch.id}
          />
        ) : (
          <input
            type="hidden"
            name="platform_batch_id"
            value={activeDraft.platformBatchId}
          />
        )}
        <input
          type="hidden"
          name="schedule_type"
          value={scheduledAt ? "schedule" : "now"}
        />
        {scheduledAt && (
          <input type="hidden" name="scheduled_at" value={scheduledAt} />
        )}
        <CustomDateTimePicker
          value={scheduledAt}
          onChange={setScheduledAt}
          min={new Date().toISOString().slice(0, 16)}
        />

        <LoadingButton
          type="submit"
          className="postBtn"
          disabled={!finalCanSchedule || isCurrentlyScheduled || loading}
          loading={loading}
          formAction={scheduleAction}
          loadingLabel={scheduledAt ? "Scheduling" : "Posting"}
          icon={
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          }
        >
          {isCurrentlyScheduled ? "Scheduled" : scheduledAt ? "Schedule" : "Post"}
        </LoadingButton>
      </form>
    </div>
  );
}
