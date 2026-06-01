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
import { refreshAnalyticsAction } from "../actions";
import Header from "../Header";
import LoadingButton from "../LoadingButton";
import UserAvatar from "../UserAvatar";
import MarkdownRenderer from "../MarkdownRenderer";
import { AppNotice } from "../AppNotice";

type JsonRecord = Record<string, unknown>;

const PLATFORM_LABELS: Record<string, string> = {
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  "linkedin-page": "LinkedIn Page",
  threads: "Threads",
  medium: "Medium",
  facebook: "Facebook",
  instagram: "Instagram",
  "instagram-standalone": "Instagram",
  telegram: "Telegram",
};

const PLATFORM_ICON_CLASS: Record<string, string> = {
  x: "x",
  linkedin: "linkedin",
  "linkedin-page": "linkedin",
  threads: "threads",
  medium: "medium",
  facebook: "linkedin",
  instagram: "instagram",
  "instagram-standalone": "instagram",
  telegram: "linkedin",
};

const TREND_PATH_DEFAULT =
  "M0 70 C 30 60, 50 75, 80 55 C 110 35, 130 65, 160 50 C 190 35, 220 20, 260 25";

const PLATFORM_PATH_DEFAULT =
  "M0 22 C 20 14, 35 30, 55 18 C 75 6, 95 28, 115 16 C 135 4, 155 22, 175 14 C 195 6, 210 18, 220 12";

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatCount(value: number | null): string {
  if (value === null) return "—";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(Math.round(value));
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function formatChange(value: number | null): { label: string; positive: boolean } | null {
  if (value === null) return null;
  const positive = value >= 0;
  const arrow = positive ? "↑" : "↓";
  return {
    label: `${arrow} ${Math.abs(value).toFixed(0)}%`,
    positive,
  };
}

function platformLabel(identifier: string): string {
  return PLATFORM_LABELS[identifier] ?? identifier;
}

function platformIconClass(identifier: string): string {
  return PLATFORM_ICON_CLASS[identifier] ?? "generic";
}

function platformInitial(identifier: string): string {
  const label = platformLabel(identifier);
  return label.charAt(0).toUpperCase();
}

type PlatformMetricRow = {
  identifier: string;
  label: string;
  iconClass: string;
  connected: boolean;
  followers: number | null;
  engagementRate: number | null;
  avgLikes: number | null;
  postCount: number | null;
  change: { label: string; positive: boolean } | null;
  summary: string;
  trendPath: string;
};

function buildPlatformRows(
  platformSummary: JsonRecord[],
  integrations: Array<{ identifier: string; name: string; disabled: boolean }>,
): PlatformMetricRow[] {
  const summaryByPlatform = new Map<string, JsonRecord>();
  for (const entry of platformSummary) {
    const id = textValue(entry.platform, "");
    if (id) summaryByPlatform.set(id, entry);
  }

  const orderedIdentifiers = Array.from(
    new Set([
      ...integrations
        .filter((integration) => !integration.disabled)
        .map((integration) => integration.identifier),
      ...platformSummary.map((entry) => textValue(entry.platform, "")).filter(Boolean),
    ]),
  );

  return orderedIdentifiers.map((identifier) => {
    const entry = summaryByPlatform.get(identifier) ?? {};
    const integration = integrations.find((item) => item.identifier === identifier);
    return {
      identifier,
      label: platformLabel(identifier),
      iconClass: platformIconClass(identifier),
      connected: Boolean(integration && !integration.disabled),
      followers: numericValue(entry.followers),
      engagementRate: numericValue(entry.engagement_rate),
      avgLikes: numericValue(entry.avg_likes),
      postCount: numericValue(entry.post_count ?? entry.posts),
      change: formatChange(numericValue(entry.change_pct ?? entry.change)),
      summary: textValue(entry.summary, ""),
      trendPath: PLATFORM_PATH_DEFAULT,
    };
  });
}

type Props = {
  data: any;
  initialErrorMessage: string | null;
};

export default function AnalyticsClient({ data, initialErrorMessage }: Props) {
  const router = useRouter();
  const { vaultStatus, credentials, passphrase } = useVault();
  const [localData, setLocalData] = useState<LocalAppData>(EMPTY_LOCAL_APP_DATA);
  const [dashboardData, setDashboardData] = useState(data);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialErrorMessage);

  useEffect(() => {
    if (!passphrase || vaultStatus === "missing" || vaultStatus === "locked") return;
    let cancelled = false;
    loadLocalAppData(data.user.id, passphrase)
      .then((loaded) => {
        if (cancelled) return;
        setLocalData(loaded);
        setDashboardData(mergeDashboardData(data, loaded));
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load local data");
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

  const dashboardJson = asRecord(dashboardData.latest_insight_digest?.dashboardJson);
  const topPosts = asArray<JsonRecord>(dashboardJson.top_posts);
  const platformSummary = asArray<JsonRecord>(dashboardJson.platform_summary);
  const keyFindings = asArray<string>(dashboardJson.key_findings);

  const integrations = dashboardData.postiz_integrations.map((integration: any) => ({
    identifier: integration.identifier,
    name: integration.name,
    disabled: integration.disabled,
  }));

  const platformRows = buildPlatformRows(platformSummary, integrations);
  const hasDigest = Boolean(dashboardData.latest_insight_digest);
  const trendChange = formatChange(numericValue(dashboardJson.engagement_change_pct));

  const canAnalyze =
    dashboardData.readiness.can_analyze ||
    (vaultStatus === "connected" && integrations.some((item: any) => !item.disabled));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (vaultStatus === "connected") {
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

        const res = await fetch("/api/vault/refresh-analytics", {
          method: "POST",
          headers,
          body: JSON.stringify({
            activePersonaMd: localData.active_persona_summary?.persona_md ?? null,
          }),
        });
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Failed to refresh analytics");
        }
        await persistLocalData({
          ...localData,
          latest_insight_digest: resData.insightDigest,
        });
      } else {
        await refreshAnalyticsAction();
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to refresh analytics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pageShell analyticsShell">
      <Header
        showBack
        avatarUrl={data.user_profile?.avatarUrl}
        avatarInitial={data.user_profile?.avatarInitial}
      />

      <section className="analyticsLayout">
        {error && (
          <AppNotice variant="error" title="Analytics unavailable">
            {error}
          </AppNotice>
        )}

        <article className="analyticsHero">
          <UserAvatar
            src={data.user_profile?.avatarUrl}
            initial={data.user_profile?.avatarInitial}
            className="analyticsHeroAvatar"
            alt="Profile"
          />
          <div className="analyticsHeroBody">
            <h1 className="analyticsHeroTitle">Analytics</h1>
            <p className="analyticsHeroLead">
              Track performance, analyze trends, and uncover key insights.
            </p>
          </div>
        </article>

        <div className="analyticsRow">
          <article className="analyticsCardSurface trendsCard">
            <header className="analyticsCardHead">
              <h2 className="analyticsCardTitle">Trends</h2>
            </header>
            <div className="trendChartWrap">
              <svg
                className="trendChart"
                viewBox="0 0 260 90"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d={`${TREND_PATH_DEFAULT} L 260 90 L 0 90 Z`}
                  fill="var(--accent-soft)"
                />
                <path
                  d={TREND_PATH_DEFAULT}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <footer className="trendFooter">
              <span className="trendCaption">Engagement over time</span>
              {trendChange && (
                <span
                  className={`trendDelta ${
                    trendChange.positive ? "trendDeltaUp" : "trendDeltaDown"
                  }`}
                >
                  {trendChange.label}
                </span>
              )}
            </footer>
          </article>

          <article
            className="analyticsCardSurface findingsCard"
            id="key-findings"
          >
            <header className="analyticsCardHead">
              <h2 className="analyticsCardTitle">Key Findings</h2>
            </header>
            {keyFindings.length > 0 ? (
              <ul className="findingsList">
                {keyFindings.map((finding, index) => (
                  <li key={index}>{finding}</li>
                ))}
              </ul>
            ) : (
              <p className="findingsEmpty">
                {hasDigest
                  ? "No findings in this digest."
                  : "Refresh analytics to generate findings."}
              </p>
            )}
          </article>
        </div>

        <article className="analyticsCardSurface platformCard">
          <header className="analyticsCardHead">
            <h2 className="analyticsCardTitle">Platform-Specific</h2>
          </header>

          {platformRows.length === 0 ? (
            <p className="findingsEmpty">
              Connect a platform in Settings, then refresh analytics.
            </p>
          ) : (
            <ul className="platformList">
              {platformRows.map((row) => (
                <li key={row.identifier} className="platformRow">
                  <div className="platformRowHead">
                    <div className={`platformRowIcon ${row.iconClass}`}>
                      {platformInitial(row.identifier)}
                    </div>
                    <div className="platformRowMeta">
                      <p className="platformRowName">{row.label}</p>
                      <p
                        className={`platformRowStatus ${
                          row.connected
                            ? "platformRowStatusOn"
                            : "platformRowStatusOff"
                        }`}
                      >
                        <span className="statusDot" aria-hidden />
                        {row.connected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>

                  <dl className="platformMetrics">
                    <div className="metricCell">
                      <dt>Followers</dt>
                      <dd>{formatCount(row.followers)}</dd>
                    </div>
                    <div className="metricCell">
                      <dt>Engagement Rate</dt>
                      <dd>{formatPercent(row.engagementRate)}</dd>
                    </div>
                    <div className="metricCell">
                      <dt>Avg. Likes</dt>
                      <dd>{formatCount(row.avgLikes)}</dd>
                    </div>
                    <div className="metricCell">
                      <dt>Posts</dt>
                      <dd>{formatCount(row.postCount)}</dd>
                    </div>
                  </dl>

                  <div className="platformRowFooter">
                    <svg
                      className="platformSpark"
                      viewBox="0 0 220 28"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <path
                        d={row.trendPath}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    {row.change && (
                      <div
                        className={`platformChange ${
                          row.change.positive
                            ? "platformChangeUp"
                            : "platformChangeDown"
                        }`}
                      >
                        <span>{row.change.label}</span>
                        <span className="platformChangeNote">vs last 30 days</span>
                      </div>
                    )}
                  </div>

                  {row.summary && (
                    <p className="platformRowSummary">{row.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </article>

        {topPosts.length > 0 && (
          <article className="analyticsCardSurface">
            <header className="analyticsCardHead">
              <h2 className="analyticsCardTitle">Top Posts</h2>
            </header>
            <ul className="topPostsList">
              {topPosts.map((post, index) => (
                <li key={index} className="topPostItem">
                  <p className="topPostHeading">
                    {textValue(post.platform, "Channel")}
                  </p>
                  <p className="topPostBody">{textValue(post.summary, "")}</p>
                </li>
              ))}
            </ul>
          </article>
        )}

        {hasDigest && dashboardData.latest_insight_digest && (
          <article className="analyticsCardSurface">
            <header className="analyticsCardHead">
              <h2 className="analyticsCardTitle">Summary</h2>
            </header>
            <MarkdownRenderer content={dashboardData.latest_insight_digest.emailMarkdown} />
          </article>
        )}

        <form onSubmit={handleSubmit} className="analyticsRefreshBar">
          <LoadingButton
            type="submit"
            className="analyticsRefreshBtn"
            disabled={!canAnalyze || loading}
            loading={loading}
            loadingLabel="Refreshing"
            icon={
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
            }
          >
            Refresh Analytics
          </LoadingButton>
        </form>
      </section>
    </main>
  );
}
