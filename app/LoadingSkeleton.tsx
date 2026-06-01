import Header from "./Header";

type LoadingSkeletonProps = {
  section?: "write" | "analytics" | "settings";
};

function SkeletonLine({ className = "" }: { className?: string }) {
  return <span className={`skeletonLine ${className}`} />;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`skeletonBlock ${className}`} />;
}

function WriteSkeleton() {
  return (
    <>
      <section className="stack composeSection skeletonStack">
        <div className="skeletonTabs">
          <SkeletonLine className="skeletonPill" />
          <SkeletonLine className="skeletonPill skeletonShort" />
          <SkeletonLine className="skeletonPill" />
        </div>
        <article className="composeCard skeletonPanel">
          <div className="composeRow">
            <SkeletonBlock className="skeletonCircle" />
            <div className="skeletonColumn">
              <SkeletonLine className="skeletonWide" />
              <SkeletonLine />
              <SkeletonLine className="skeletonShort" />
            </div>
          </div>
          <div className="composeFooter">
            <SkeletonLine className="skeletonShort" />
            <SkeletonLine className="skeletonButton" />
          </div>
        </article>
      </section>
      <section className="stack draftsSection skeletonStack">
        <SkeletonLine className="skeletonTitle" />
        <article className="draftsCard skeletonPanel">
          <div className="draftCardHeader">
            <div className="draftProfileBlock">
              <SkeletonBlock className="skeletonCircle" />
              <div className="skeletonColumn">
                <SkeletonLine className="skeletonMedium" />
                <SkeletonLine className="skeletonShort" />
              </div>
            </div>
            <SkeletonBlock className="skeletonIconButton" />
          </div>
          <SkeletonLine className="skeletonWide" />
          <SkeletonLine />
          <SkeletonLine className="skeletonMedium" />
          <SkeletonBlock className="skeletonMedia" />
        </article>
      </section>
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <section className="analyticsLayout">
      <article className="analyticsHero skeletonPanel">
        <SkeletonBlock className="skeletonAvatar" />
        <div className="skeletonColumn">
          <SkeletonLine className="skeletonTitle" />
          <SkeletonLine className="skeletonWide" />
        </div>
      </article>
      <div className="analyticsRow">
        <article className="analyticsCardSurface skeletonPanel">
          <SkeletonLine className="skeletonMedium" />
          <SkeletonBlock className="skeletonChart" />
        </article>
        <article className="analyticsCardSurface skeletonPanel">
          <SkeletonLine className="skeletonMedium" />
          <SkeletonLine />
          <SkeletonLine className="skeletonWide" />
          <SkeletonLine className="skeletonShort" />
        </article>
      </div>
      <article className="analyticsCardSurface skeletonPanel">
        <SkeletonLine className="skeletonTitle" />
        <SkeletonBlock className="skeletonRow" />
        <SkeletonBlock className="skeletonRow" />
        <SkeletonBlock className="skeletonRow" />
      </article>
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <section className="settingsLayout">
      <article className="settingsCard profileCard skeletonPanel">
        <div className="profileHero">
          <SkeletonBlock className="skeletonAvatar" />
          <div className="skeletonColumn">
            <SkeletonLine className="skeletonTitle" />
            <SkeletonLine className="skeletonWide" />
          </div>
        </div>
        <div className="profileNicknameSection">
          <SkeletonLine className="skeletonWide" />
          <SkeletonLine className="skeletonButton" />
        </div>
      </article>
      <div className="settingsRow">
        <article className="settingsCard skeletonPanel">
          <SkeletonLine className="skeletonTitle" />
          <SkeletonBlock className="skeletonTextArea" />
        </article>
        <article className="settingsCard skeletonPanel">
          <SkeletonLine className="skeletonTitle" />
          <SkeletonBlock className="skeletonDrop" />
        </article>
      </div>
    </section>
  );
}

export default function LoadingSkeleton({ section = "write" }: LoadingSkeletonProps) {
  const shellClass =
    section === "analytics"
      ? "pageShell analyticsShell"
      : section === "settings"
        ? "pageShell settingsShell"
        : "pageShell";

  return (
    <main className={shellClass}>
      <Header showBack={section !== "write"} avatarLoading />
      <div className="routeLoadingStatus" role="status" aria-live="polite">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <circle className="loadingMarkTrack" cx="12" cy="12" r="9" />
          <path className="loadingMarkPath" d="M21 12a9 9 0 0 1-9 9" />
        </svg>
        <span>Loading</span>
      </div>
      {section === "analytics" ? (
        <AnalyticsSkeleton />
      ) : section === "settings" ? (
        <SettingsSkeleton />
      ) : (
        <WriteSkeleton />
      )}
    </main>
  );
}
