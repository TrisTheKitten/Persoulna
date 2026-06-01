import type { ReactNode } from "react";

const TREND_PATH =
  "M0 70 C 30 60, 50 75, 80 55 C 110 35, 130 65, 160 50 C 190 35, 220 20, 260 25";

const DEMO_PERSONA =
  "Direct, technical, concrete examples. No hype. Short sentences and clear outcomes.";

const DEMO_CHANNELS = [
  { id: "x", label: "X", profile: "@persoulna" },
  { id: "linkedin", label: "LinkedIn", profile: "Persoulna" },
  { id: "threads", label: "Threads", profile: "@persoulna" },
] as const;

const COMPOSE_PLATFORMS = [
  { id: "x", label: "X", checked: true },
  { id: "linkedin", label: "LinkedIn", checked: true },
  { id: "threads", label: "Threads", checked: true },
  { id: "medium", label: "Medium", checked: false },
] as const;

const COMPOSE_COMMAND =
  "Write 1 tweet about our v2 launch, 1 LinkedIn post, and 1 Threads post.";

const FORMAT_LABELS: Record<string, string> = {
  x: "Tweet",
  linkedin: "Post",
  threads: "Post",
  medium: "Article",
};

const PLATFORM_ICONS: Record<string, ReactNode> = {
  x: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  threads: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.803-1.79-.128 2.754-1.19 5.072-3.988 5.072-.037 0-.075 0-.112-.002-1.588-.048-2.837-.563-3.608-1.502-.658-.804-.992-1.867-.953-3.047.08-2.42 1.652-4.098 3.92-4.216 1.09-.056 2.12.248 2.927.882.663.52 1.137 1.225 1.388 2.043.158-.392.276-.805.348-1.237.34-2.055-.14-3.65-1.396-4.685-1.068-.88-2.639-1.293-4.566-1.22-2.38.09-4.145.846-5.245 2.237-.87 1.1-1.325 2.6-1.353 4.458v.057c.028 1.859.483 3.358 1.353 4.458 1.1 1.391 2.865 2.148 5.245 2.237 1.072-.032 2.076-.2 2.994-.5 1.613-.525 2.95-1.452 3.965-2.745 1.19-1.506 1.892-3.378 2.076-5.568l.022-.252c.565.346.981.793 1.232 1.327.735 1.562.597 4.274-1.497 6.328-1.847 1.81-4.12 2.677-7.342 2.697zM10.684 15.59c-.04 1.18.42 2.178 1.318 2.753.75.483 1.73.65 2.872.487 1.82-.26 2.88-1.463 2.848-2.86-.017-.738-.29-1.358-.787-1.794-.538-.472-1.302-.76-2.217-.826-1.316-.095-2.293.52-2.718 1.567l-.204.498-.212-.175c-.326-.267-.507-.605-.539-.987-.06-.71.38-1.35 1.156-1.661a3.27 3.27 0 01.762-.212c-.478-.716-1.28-1.082-2.33-1.055-1.587.04-2.58.87-2.632 2.422z" />
    </svg>
  ),
  medium: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
};

function DemoPlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "x":
      return (
        <div className="draftPlatformIcon x">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
      );
    case "linkedin":
      return (
        <div className="draftPlatformIcon linkedin">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
      );
    case "threads":
      return (
        <div className="draftPlatformIcon threads">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
            <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.803-1.79-.128 2.754-1.19 5.072-3.988 5.072-.037 0-.075 0-.112-.002-1.588-.048-2.837-.563-3.608-1.502-.658-.804-.992-1.867-.953-3.047.08-2.42 1.652-4.098 3.92-4.216 1.09-.056 2.12.248 2.927.882.663.52 1.137 1.225 1.388 2.043.158-.392.276-.805.348-1.237.34-2.055-.14-3.65-1.396-4.685-1.068-.88-2.639-1.293-4.566-1.22-2.38.09-4.145.846-5.245 2.237-.87 1.1-1.325 2.6-1.353 4.458v.057c.028 1.859.483 3.358 1.353 4.458 1.1 1.391 2.865 2.148 5.245 2.237 1.072-.032 2.076-.2 2.994-.5 1.613-.525 2.95-1.452 3.965-2.745 1.19-1.506 1.892-3.378 2.076-5.568l.022-.252c.565.346.981.793 1.232 1.327.735 1.562.597 4.274-1.497 6.328-1.847 1.81-4.12 2.677-7.342 2.697zM10.684 15.59c-.04 1.18.42 2.178 1.318 2.753.75.483 1.73.65 2.872.487 1.82-.26 2.88-1.463 2.848-2.86-.017-.738-.29-1.358-.787-1.794-.538-.472-1.302-.76-2.217-.826-1.316-.095-2.293.52-2.718 1.567l-.204.498-.212-.175c-.326-.267-.507-.605-.539-.987-.06-.71.38-1.35 1.156-1.661a3.27 3.27 0 01.762-.212c-.478-.716-1.28-1.082-2.33-1.055-1.587.04-2.58.87-2.632 2.422z" />
          </svg>
        </div>
      );
    case "medium":
      return (
        <div className="draftPlatformIcon medium">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
            <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42zM24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
          </svg>
        </div>
      );
    case "instagram":
      return (
        <div className="draftPlatformIcon instagram">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="draftPlatformIcon generic">
          <span>{platform.slice(0, 1).toUpperCase()}</span>
        </div>
      );
  }
}

function SettingsPreview() {
  return (
    <div className="landingWorkflowDemo">
      <div className="settingsRow">
        <article className="settingsCard">
          <h2 className="cardTitle">Personality</h2>
          <div className="personalityField">
            <textarea readOnly rows={3} value={DEMO_PERSONA} tabIndex={-1} aria-readonly />
            <span className="charCounter">24/300</span>
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
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p className="dropTitle">Upload text file</p>
            <p className="dropHint">Writing samples and brand notes (.txt)</p>
            <span className="chooseFileBtn landingWorkflowBtnStatic">Choose File</span>
          </div>
        </article>
      </div>
      <ul className="channelList" style={{ marginTop: "12px" }}>
        {DEMO_CHANNELS.map((channel) => (
          <li key={channel.id} className="channelRow">
            <div>
              <p className="channelLabel">
                {PLATFORM_ICONS[channel.id]}
                {channel.label}
              </p>
              <p className="channelMeta">{channel.profile}</p>
            </div>
            <span className="channelStatus on" title="Connected" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComposePreview() {
  return (
    <div className="landingWorkflowDemo">
      <div className="stack composeSection" style={{ gap: "12px", marginTop: 0 }}>
        <div className="platformTabs">
          {COMPOSE_PLATFORMS.map((platform) => (
            <div className="platformTabLabel" key={platform.id}>
              <div className={`platformTab${platform.checked ? " platformTabOn" : ""}`}>
                {PLATFORM_ICONS[platform.id]}
                <span>{platform.label}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="composeCard">
          <div className="composeRow">
            <div className="circlePickerContainer">
              <span className="circlePickerBtn" aria-hidden>
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
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </span>
            </div>
            <textarea
              className="composeTextarea"
              readOnly
              rows={3}
              value={COMPOSE_COMMAND}
              tabIndex={-1}
              aria-readonly
            />
          </div>
          <div className="composeFooter">
            <span className="composeGreeting">Hi, Leona</span>
            <span className="generateBtn landingWorkflowBtnStatic" aria-hidden>
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
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Generate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type DraftPreviewProps = {
  platform: { id: string; label: string; draft: string };
  platformIndex: number;
  platformCount: number;
};

function DraftsPreview({ platform, platformIndex, platformCount }: DraftPreviewProps) {
  return (
    <div className="landingWorkflowDemo">
      <div className="stack draftsSection" style={{ gap: "12px", marginTop: 0 }}>
        <div className="draftsSectionHeader">
          <h2 className="draftsTitle">Drafts</h2>
          <label className="postAllContainer">
            <span>Post All</span>
            <label className="toggleSwitch">
              <input type="checkbox" defaultChecked readOnly tabIndex={-1} aria-hidden />
              <span className="toggleSlider" />
            </label>
          </label>
        </div>
        <article className="draftsCard">
          <div className="draftCardHeader">
            <div className="draftProfileBlock">
              <DemoPlatformIcon platform={platform.id} />
              <div className="draftPlatformInfo">
                <span className="draftPlatformName">{platform.label}</span>
                <span className="draftPlatformSubtitle">
                  {FORMAT_LABELS[platform.id] ?? "Post"}
                </span>
              </div>
            </div>
            <span className="editDraftBtn" aria-hidden>
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
            </span>
          </div>
          <p className="draftBodyContent">{platform.draft}</p>
        </article>
        <div className="carouselDots" aria-hidden>
          {Array.from({ length: platformCount }, (_, index) => (
            <span
              key={index}
              className={`dot${index === platformIndex ? " active" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SchedulePreview() {
  return (
    <div className="landingWorkflowDemo landingWorkflowDemoSchedule">
      <div className="bottomActionBar landingWorkflowActionBar" aria-hidden>
        <span className="selectDateBtn landingWorkflowBtnStatic">
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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          <span>Thu, May 22 · 2:00 PM</span>
        </span>
        <span className="postBtn landingWorkflowBtnStatic">
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
          Post
        </span>
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  return (
    <div className="landingWorkflowDemo">
      <div className="analyticsRow">
        <article className="analyticsCardSurface trendsCard">
          <header className="analyticsCardHead">
            <h2 className="analyticsCardTitle">Trends</h2>
          </header>
          <div className="trendChartWrap">
            <svg className="trendChart" viewBox="0 0 260 90" preserveAspectRatio="none" aria-hidden>
              <path d={`${TREND_PATH} L 260 90 L 0 90 Z`} fill="var(--accent-soft)" />
              <path
                d={TREND_PATH}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <footer className="trendFooter">
            <span className="trendCaption">Engagement over time</span>
            <span className="trendDelta trendDeltaUp">+12.4% (90 days)</span>
          </footer>
        </article>
        <article className="analyticsCardSurface findingsCard" id="key-findings">
          <header className="analyticsCardHead">
            <h2 className="analyticsCardTitle">Key Findings</h2>
          </header>
          <ul className="findingsList">
            <li>LinkedIn engagement up 12.4% over the last 90 days.</li>
            <li>X posts with product screenshots averaged 2× replies.</li>
          </ul>
        </article>
      </div>
    </div>
  );
}

export type LandingWorkflowPreviewType =
  | "settings"
  | "compose"
  | "drafts"
  | "schedule"
  | "analytics";

type LandingWorkflowPreviewProps = {
  type: LandingWorkflowPreviewType;
  draftPlatform: { id: string; label: string; draft: string };
  draftPlatformIndex: number;
  draftPlatformCount: number;
};

export default function LandingWorkflowPreview({
  type,
  draftPlatform,
  draftPlatformIndex,
  draftPlatformCount,
}: LandingWorkflowPreviewProps) {
  switch (type) {
    case "settings":
      return <SettingsPreview />;
    case "compose":
      return <ComposePreview />;
    case "drafts":
      return (
        <DraftsPreview
          platform={draftPlatform}
          platformIndex={draftPlatformIndex}
          platformCount={draftPlatformCount}
        />
      );
    case "schedule":
      return <SchedulePreview />;
    case "analytics":
      return <AnalyticsPreview />;
    default:
      return null;
  }
}
