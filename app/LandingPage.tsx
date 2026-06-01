"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import LandingAuthSection from "./LandingAuthSection";
import LandingWorkflowPreview from "./LandingWorkflowPreview";

const WORKFLOW_STEPS = [
  {
    id: "settings",
    phase: "Setup",
    title: "Vault, persona, channels",
    summary:
      "Unlock your browser vault for Gemini and Postiz keys, set persona, upload .txt writing samples, and sync Postiz channels.",
    preview: "settings" as const,
  },
  {
    id: "compose",
    phase: "Write",
    title: "Chat command",
    summary:
      "Select synced channels, type one chat command, and attach up to four images. The parser builds one draft per platform.",
    preview: "compose" as const,
  },
  {
    id: "drafts",
    phase: "Review",
    title: "Edit drafts",
    summary:
      "Swipe through per-platform drafts, edit copy, and adjust platform-specific fields before you publish.",
    preview: "drafts" as const,
  },
  {
    id: "schedule",
    phase: "Publish",
    title: "Post or schedule",
    summary:
      "Post now or pick a time. Persoulna sends the approved draft to Postiz for that channel.",
    preview: "schedule" as const,
  },
  {
    id: "analytics",
    phase: "Analyze",
    title: "Analytics digest",
    summary:
      "Our AI summarizes the last 90 days of your social data in one click.",
    preview: "analytics" as const,
  },
] as const;

const HERO_POST_PREVIEWS = [
  {
    platform: "x",
    name: "Persoulna",
    handle: "@persoulna",
    format: "Tweet",
    body: "v2 ships Thursday — one chat command on Write, one draft per platform, publish through Postiz.",
  },
  {
    platform: "linkedin",
    name: "Persoulna",
    handle: "@persoulna",
    format: "Post",
    body: "We shipped v2: type one command, review tailored drafts for each channel, then post or schedule.",
  },
  {
    platform: "threads",
    name: "Persoulna",
    handle: "@persoulna",
    format: "Post",
    body: "Same topic, different shape — Persoulna parsed one command into separate X, LinkedIn, and Threads drafts.",
  },
] as const;

function HeroPostPlatformIcon({ platform }: { platform: string }) {
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
            <path d="M12.5 2C6.977 2 2.5 6.477 2.5 12s4.477 10 10 10c2.584 0 4.908-.98 6.663-2.583a1 1 0 1 0-1.326-1.498A7.973 7.973 0 0 1 12.5 20c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8c0 1.933-.567 3.5-1.5 3.5-.478 0-.85-.246-.98-.679a4.996 4.996 0 0 0-4.02 1.679A2.993 2.993 0 0 1 12.5 17c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5c0 3.038-1.567 5.5-3.5 5.5-1.127 0-2.072-.619-2.52-1.52A4.975 4.975 0 0 1 7.5 12c0-2.757 2.243-5 5-5s5 2.243 5 5a2.991 2.991 0 0 1-5 2.22A1 1 0 1 0 11.22 15.8 4.978 4.978 0 0 0 12.5 16c2.757 0 5-2.243 5-5 0-2.757-2.243-5-5-5s-5 2.243-5 5 2.243 5 5 5z" />
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

const BENEFITS = [
  {
    title: "One command",
    body: "Type a chat request once; Persoulna parses it into tailored drafts for each channel you select.",
  },
  {
    title: "AI adapts to your style",
    body: "Persona and writing samples guide generation. Optional images up to four files, 5 MB each.",
  },
  {
    title: "Review and publish",
    body: "Edit every draft on Write, then post now or schedule through Postiz without leaving the flow.",
  },
  {
    title: "BYOK",
    body: "Gemini and Postiz keys stay in your encrypted browser vault. No subscription or platform fees—only your API usage.",
  },
];

const DRAFT_PLATFORMS_PREVIEW = [
  { id: "x", label: "X", draft: "v2 ships Thursday — one chat command on Write, one tweet, publish through Postiz." },
  { id: "linkedin", label: "LinkedIn", draft: "We shipped v2: one command parsed into channel-specific drafts, then post or schedule." },
  { id: "threads", label: "Threads", draft: "Same launch topic as X and LinkedIn, shaped for Threads from a single command." },
  { id: "medium", label: "Medium", draft: "How Persoulna turns one chat command into per-platform drafts and Postiz scheduling." },
];

const WORKFLOW_INTERVAL_MS = 6000;

type LandingPageProps = {
  authError?: string | null;
  initialAuthMode?: "signin" | "signup";
  nextPath?: string;
};

export default function LandingPage({
  authError = null,
  initialAuthMode = "signup",
  nextPath = "/write",
}: LandingPageProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">(initialAuthMode);
  const [activeStep, setActiveStep] = useState(0);
  const [heroPostIndex, setHeroPostIndex] = useState(0);
  const [draftPlatformIndex, setDraftPlatformIndex] = useState(0);
  const [workflowPaused, setWorkflowPaused] = useState(false);
  const workflowRef = useRef<HTMLElement>(null);
  const authRef = useRef<HTMLElement>(null);
  const step = WORKFLOW_STEPS[activeStep];

  const openAuth = useCallback((mode: "signin" | "signup") => {
    setAuthMode(mode);
    authRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectStep = useCallback((index: number) => {
    setActiveStep(index);
    setWorkflowPaused(true);
  }, []);

  useEffect(() => {
    setAuthMode(initialAuthMode);
  }, [initialAuthMode]);

  useEffect(() => {
    if (!authError) return;
    openAuth(initialAuthMode);
  }, [authError, initialAuthMode, openAuth]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroPostIndex((i) => (i + 1) % HERO_POST_PREVIEWS.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (workflowPaused) return;
    const interval = window.setInterval(() => {
      setActiveStep((i) => (i + 1) % WORKFLOW_STEPS.length);
    }, WORKFLOW_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [workflowPaused]);

  useEffect(() => {
    if (activeStep !== 2) return;
    const interval = window.setInterval(() => {
      setDraftPlatformIndex((i) => (i + 1) % DRAFT_PLATFORMS_PREVIEW.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [activeStep]);

  useEffect(() => {
    const node = workflowRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
          setWorkflowPaused(false);
        }
      },
      { threshold: [0, 0.2, 0.5] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const heroPost = HERO_POST_PREVIEWS[heroPostIndex];

  return (
    <div className="landingShell">
      <header className="landingHeader">
        <Link className="brandLogo" href="/">
          Per<span className="brandSoul">soul</span>na
        </Link>
        <nav className="landingNav" aria-label="Site">
          <button type="button" className="landingNavLink landingNavBtn" onClick={() => openAuth("signin")}>
            Sign In
          </button>
          <button type="button" className="landingNavCta" onClick={() => openAuth("signup")}>
            Sign Up
          </button>
        </nav>
      </header>

      <section className="landingHero">
        <div className="landingHeroInner">
          <div className="landingHeroCopy">
            <p className="landingEyebrow">Multi-platform publishing</p>
            <h1 className="landingTitle">Automate your social posts on the fly</h1>
            <p className="landingLead">
              Type one command, review drafts in your voice, then post or schedule across X, LinkedIn, Threads, and Medium.
            </p>
            <article className="landingHeroPost" aria-live="polite">
              <header className="landingHeroPostHead">
                <div className="draftProfileBlock">
                  <HeroPostPlatformIcon platform={heroPost.platform} />
                  <div className="draftPlatformInfo">
                    <span className="draftPlatformName">{heroPost.name}</span>
                    <span className="draftPlatformSubtitle">
                      {heroPost.handle} · {heroPost.format}
                    </span>
                  </div>
                </div>
                <span className="landingHeroPostTime">now</span>
              </header>
              <p key={heroPostIndex} className="landingHeroPostBody">
                {heroPost.body}
              </p>
              <footer className="landingHeroPostActions" aria-hidden>
                <span className="landingHeroPostAction">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </span>
                <span className="landingHeroPostAction">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </span>
                <span className="landingHeroPostAction">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>
              </footer>
            </article>
            <div className="landingHeroCtas">
              <button type="button" className="generateBtn" onClick={() => openAuth("signup")}>
                Create Account
              </button>
            </div>
          </div>
          <div className="landingHeroVisual">
            <div className="landingHeroImageFrame">
              <Image
                src="/header.png"
                alt="Persoulna on a phone: write a post, generate drafts, and publish across platforms"
                fill
                sizes="(max-width: 899px) min(100vw, 480px), 480px"
                quality={90}
                priority
                className="landingHeroImage"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="landingBenefits" aria-label="Product benefits">
        <ul className="landingBenefitGrid">
          {BENEFITS.map((item) => (
            <li key={item.title} className="landingBenefitItem">
              <h3 className="landingBenefitTitle">{item.title}</h3>
              <p className="landingBenefitBody">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="landingFlow"
        id="how-it-works"
        ref={workflowRef}
        aria-labelledby="flow-heading"
        onMouseEnter={() => setWorkflowPaused(true)}
        onMouseLeave={() => setWorkflowPaused(false)}
      >
        <div className="landingFlowIntro">
          <h2 id="flow-heading" className="landingSectionTitle">
            How it works
          </h2>
        </div>

        <div className="landingPhaseTabs" role="tablist" aria-label="Workflow phases">
          {WORKFLOW_STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeStep === index}
              className={`landingPhaseTab${activeStep === index ? " landingPhaseTabOn" : ""}`}
              onClick={() => selectStep(index)}
            >
              {item.phase}
            </button>
          ))}
        </div>

        <div className="landingFlowPanel">
          <div
            className="landingCanvas"
            id="workflow-panel"
            role="tabpanel"
            aria-labelledby={`flow-tab-${step.id}`}
          >
            <div key={`${step.id}-${draftPlatformIndex}`} className="landingCanvasSwap">
              <LandingWorkflowPreview
                type={step.preview}
                draftPlatform={DRAFT_PLATFORMS_PREVIEW[draftPlatformIndex]}
                draftPlatformIndex={draftPlatformIndex}
                draftPlatformCount={DRAFT_PLATFORMS_PREVIEW.length}
              />
            </div>
          </div>
          <div className="landingFlowCopy">
            <p className="landingFlowPhase">{step.phase}</p>
            <h3 className="landingFlowTitle">{step.title}</h3>
            <p className="landingFlowSummary">{step.summary}</p>
          </div>
        </div>

        <div className="landingProgress" aria-hidden>
          {WORKFLOW_STEPS.map((item, index) => (
            <span
              key={item.id}
              className={`landingProgressSegment${activeStep === index ? " landingProgressSegmentOn" : ""}${index < activeStep ? " landingProgressSegmentDone" : ""}`}
            />
          ))}
        </div>
      </section>

      <section className="landingAuthBand" ref={authRef} id="account" aria-labelledby="auth-heading">
        <div className="landingAuthBandInner">
          <div className="landingAuthBandCopy">
            <h2 id="auth-heading" className="landingSectionTitle">
              {authMode === "signup" ? "Create your account" : "Sign in"}
            </h2>
            <p className="landingSectionLead">
              For sign-in only. Your persona, drafts, and API keys are not stored on our servers.
            </p>
          </div>
          <LandingAuthSection
            mode={authMode}
            onModeChange={setAuthMode}
            error={authError}
            nextPath={nextPath}
          />
        </div>
      </section>

      <footer className="landingFooter">
        <Link className="brandLogo" href="/">
          Per<span className="brandSoul">soul</span>na
        </Link>
        <p className="landingFooterCopy">Persoulna</p>
      </footer>
    </div>
  );
}
