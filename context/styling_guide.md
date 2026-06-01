# Styling Guide (`app/globals.css`)

## Design Tokens (CSS Custom Properties)
```css
--bg: #FAF6F5;               /* Warm default background */
--surface: #FFFFFF;          /* Main card surfaces */
--surface-strong: #FFFFFF;
--surface-muted: #F5ECE9;     /* Divider / light table bg */
--line: #E5C9C8;             /* Standard border tint */
--line-soft: #F5ECE9;        /* Soft divider lines */
--text: #140F0F;             /* Deep primary text */
--text-secondary: #5C4E4C;   /* Neutral secondary body text */
--muted: #7D6B69;            /* Greyed out labels/subtext */
--disabled: #A8928F;         /* Disabled state text/borders */

--accent: #116A5A;           /* Deep teal (primary brand) */
--accent-strong: #0D5246;    /* Dark teal for active states */
--accent-soft: rgba(17, 106, 90, 0.08); /* Transparent teal background */
--secondary: #D06E55;        /* Terracotta accent */
--tertiary: #2E4A9E;         /* Royal blue accent */

--ok: #10B981;               /* Success semantic color */
--warning: #F59E0B;          /* Warning semantic color */
--danger: #EF4444;           /* Error/Danger semantic color */

--radius-sm: 8px;
--radius-md: 16px;
--radius-lg: 24px;           /* Default radius for inputs and files */
--radius-xl: 32px;           /* Default radius for main card containers */
--radius-full: 9999px;       /* Pill shapes */

--content-width: 1180px;

--shadow-sm: 0 2px 8px rgba(17, 106, 90, 0.04);
--shadow-base: 0 4px 16px rgba(17, 106, 90, 0.06);
--shadow-md: 0 8px 24px rgba(17, 106, 90, 0.08);
--shadow-lg: 0 16px 32px rgba(17, 106, 90, 0.12);
--shadow-xl: 0 24px 48px rgba(17, 106, 90, 0.16);

--font-sans: var(--font-inter), Inter, sans-serif;
--font-display: var(--font-display), "Plus Jakarta Sans", sans-serif;
```

## Fonts
- **Sans font (Body and Fields):** `Inter`
- **Display font (Headings, brand, metrics):** `Plus Jakarta Sans`

## Key Visual Patterns
- **Premium Background:** Light, warm minimalist surface combining background color `#FAF6F5` with subtle accent-tinted radial glows.
- **Organic Geometry:** Clean, highly rounded geometries. Main panels and containers use `32px` (`--radius-xl`) on desktop / `24px` on mobile, inputs and drop targets use `24px` (`--radius-lg`), and buttons use `9999px` (pill structure).
- **Interactive Micro-Animations:** Floating surfaces with soft lift offsets on hover (`transform: translateY(-2px)`) and transition durations (`200ms cubic-bezier(0.4, 0, 0.2, 1)`). Page sections, card lists (drafts, analytics, settings, channels, key findings, top posts, platform tabs) animate in with a staggered `fadeInUp` keyframe on mount. Buttons scale to `0.97` on `:active` and small icon controls scale to `0.92`. Image grid thumbnails scale to `1.04` on hover. The nav drawer uses a `softPop` keyframe. All animations respect `prefers-reduced-motion: reduce` (durations collapse to `0.01ms`).
- **Loading States:** Server-action submit controls use `LoadingButton` with a compact rotating SVG mark and action-specific copy. Route transitions use `LoadingSkeleton` layouts that match the Write, Analytics, and Settings page structure with opacity pulsing rather than shimmer gradients. Draft edit and post actions use inline button loaders.
- **Notices (`AppNotice`):** Status and feedback messages (errors, blockers, saved confirmations) use `.notice` with a left semantic rail, bordered icon chip, display-font uppercase title, and body/list copy on white `--surface` cards. Variants: `.noticeError` (danger rail), `.noticeWarn` (terracotta rail, blocker lists), `.noticeSuccess` (teal rail), `.noticeInfo` (royal blue rail). Layout helpers: `.noticeInset` (draft card margins), `.noticeFlush` (zero margin inside settings cards).
- **Inputs & Focused States:** Custom inputs and textareas styled with a shadow base, with 3px focus rings (`rgba(17, 106, 90, 0.15)`) around focused fields.
- **Draft Panel Layout:** Redesigned Drafts section featuring a sliding carousel layout with pagination dots, mobile swipe, desktop arrow navigation, and inline editing forms.

## Layout Components
- `.landingShell` … Public marketing at `/`. Ceros-inspired editorial hero: `.landingHeroInner` is a two-column grid at ≥900px (copy left; `.landingHeroVisual` + `.landingHeroImageFrame` height-driven sizing for `/header.png` via `.landingHeroImage` on the right; stacks on narrow viewports). `h1.landingTitle` uses Dancing Script via `--font-landing-script`; `.landingHeroPost` is a draft-style social post card with platform header, body, optional image block, action row. 2×2 benefit grid, display-font phase tabs (`.landingPhaseTab` / `.landingPhaseTabOn` — sentence-case labels, shared baseline rule, animated underline indicator; horizontal scroll on narrow viewports with 44px min touch height ≤639px), workflow panel (`LandingWorkflowPreview` reuses app classes: `settingsCard`, `composeCard`, `draftsCard`, `analyticsCardSurface`, etc.). `#how-it-works` (`.landingFlow`): ≤899px stacks copy above canvas (`.landingFlowCopy` `order: -1`), hides duplicate `.landingFlowPhase`, tightens spacing; `.landingWorkflowDemo` keeps settings/analytics single-column until ≥1200px viewport; schedule preview stacks date/post buttons full-width ≤639px. Auth band (`.landingAuthBandInner`): at ≥900px, `.landingAuthBandCopy` is vertically centered beside the auth card. One post per platform in all copy. `/login` redirects to `/?auth=`.
- `.loginShell` / `.loginTopBar` / `.loginCard` / `.loginModeTabs`: Auth page at `/login` with tabbed Sign In / Sign Up.
- `.oauthButton` / `.oauthMark` / `.oauthDivider`: Calm neutral Google OAuth entry point shared by landing and login auth forms.
- `.pageShell`: Full-width page wrapper used by Write, Analytics, and Settings. It keeps the same `--bg` background as `body` so no side bands appear.
- `.headerContainer`: Sticky header component containing logo, avatar image, and hamburger menu.
- `.avatarSlot` / `.avatarSlotSpinner` / `.avatarSlotImage` / `.avatarSlotInitial`: `UserAvatar` wrapper used in the header and profile heroes. Shows a teal spinner until an image loads, then falls back to the user's email initial when no avatar URL exists or image loading fails.
- `.navDrawer` / `.navDrawerAction`: Slide-down mobile navigation panel toggled by the hamburger button. Link rows and the POST sign-out button share the same row styling.
- `.platformTabs`: Pill tab selector for active channels. It scrolls horizontally on mobile and wraps on tablet/desktop to avoid side-panel clipping.
- `.composeCard`: Rounded container card hosting the input layout. The full card accepts dropped command images and highlights with the ImagePicker drag state.
- `.composeRow`: Flex layout containing the ImagePicker trigger and text inputs.
- `.draftsCard`: Redesigned card containing the active slide draft.
- `.draftImageGrid`: Adaptive image grid layout displaying draft media attachments dynamically.
- `.draftPreviewControls`: Draft navigation cue. Shows "Swipe drafts" with the current count on mobile, and arrow buttons with the current count on desktop.
- `.mobileFixedBottomReserve`: In-flow spacer before fixed mobile bottom bars (`--mobile-fixed-bar-reserve` for drafts, `--mobile-save-bar-reserve` for settings) so content above (published badge, swipe controls, form fields) is not covered. Hidden at >=768px.
- `.bottomActionBar`: Sticky bottom scheduling row housing calendar date selection and action post buttons. On mobile, it renders as a screen-wide solid bottom bar with a background matching `var(--bg)` and a clear top border and shadow boundary, preceded by `.mobileFixedBottomReserve`. On desktop, it is sticky inside the document flow with a transparent background. The date button truncates its label text using ellipsis and forces the clear button to remain visible via `flex-shrink: 0`.
- `.settingsShell` / `.settingsLayout` / `.settingsStack`: Full-width single-column layout for `/settings`.
- `.settingsCard`: Rounded card used for Profile, Personality, References sections.
- `.advancedDetails` / `.advancedSummary` / `.advancedContent`: Collapsible advanced settings section inside `.settingsCard` for optional Self-Hosted & OAuth credentials. For Postiz Cloud, users only need to configure the main Postiz API Key and sync channels directly.
- `.settingsRow`: Two-column grid wrapper for paired cards (Personality + References) starting at >=1024px; stacks on smaller screens.
- `.profileCard` / `.profileHero` / `.profileHeroAvatar` / `.profileHeroTitle` / `.profileHeroLead` / `.profileConnectionsBtn`: Profile settings header mirroring the analytics hero layout (avatar + title + lead; Connections pill on the right from 768px).
- `.profileNicknameSection` / `.profileAvatarRow` / `.profileAvatarPicker` / `.profileNicknameRow` / `.profileSaveBtn`: Avatar file upload and nickname field below a soft divider; avatar upload uses a visually hidden file input with a custom pill label trigger and selected filename hint; text input uses standard bordered field styling with accent focus ring; save uses compact `.generateBtn`.
- `.connectionsBtn` / `.connectionsPanel`: Toggle and slide-out panel inside the Profile card for Postiz channel sync.
- `.personalityField` / `.charCounter`: Bordered textarea wrapper with bottom-right word counter (300 max).
- `.dropZone` / `.chooseFileBtn`: Dashed drop area for References `.txt` uploads. The file input posts selected files as `writing_examples` to the settings server action.
- `.saveBar` / `.saveBtn`: Fixed bottom bar on mobile with solid background matching `var(--bg)`, safe area paddings, and top border/shadow, preceded by `.mobileFixedBottomReserve--save`; sticky-right and transparent on desktop.
- `.analyticsShell` / `.analyticsLayout`: Full-width single-column container for `/analytics`. Disables the home grid layout via `display: block`.
- `.analyticsHero`: Profile card with avatar, "Analytics" title, lead text, and pill "Key Findings" anchor button.
- `.analyticsRow`: 1-col on mobile, 2-col grid (Trends + Key Findings) starting at >=720px.
- `.analyticsCardSurface` / `.analyticsCardHead` / `.analyticsCardChip` / `.analyticsCardTitle`: Reusable rounded card surface used by Trends, Key Findings, Platform-Specific, Top Posts, and Email Digest sections.
- `.trendChartWrap` / `.trendChart`: Inline SVG line chart with soft `var(--accent-soft)` area fill (no gradient) and `var(--accent)` stroke.
- `.findingsList`: Bullet list with teal accent dots for the AI-generated `key_findings` strings.
- `.platformList` / `.platformRow` / `.platformRowHead` / `.platformRowIcon` / `.platformMetrics` / `.platformRowFooter` / `.platformSpark` / `.platformChange`: Per-platform analytics row with channel badge, 4-column metric grid (Followers / Engagement Rate / Avg. Likes / Posts), inline sparkline, and 30-day change chip. Stacks on mobile, becomes a 3-column grid (head / metrics / footer) at >=1024px. The settings channel rows (`.channelRow`) prevent wrapping and truncate channel metadata using `flex: 1; min-width: 0` to preserve status dot visibility.
- `.analyticsRefreshBar` / `.analyticsRefreshBtn`: Solid-teal full-width refresh action on mobile, right-aligned compact button on desktop.
- `.loadingMark` / `.routeLoadingStatus`: Compact SVG loading mark for buttons and route skeleton status rows.
- `.skeletonLine` / `.skeletonBlock` / `.skeletonPanel`: Shared pulse skeleton primitives used by `loading.tsx` files.

## Component Patterns
- **Buttons:** Solid teal by default, lifting up on hover with custom shadow styling. Disabled buttons render in soft terracotta-grey (`#D9C3C0`).
- **Button Loading (`.isLoading`):** Pending primary actions keep their solid teal treatment, disable repeated interaction, show the rotating `loadingMark`, and swap to short active labels such as `Generating`, `Saving`, `Syncing`, `Refreshing`, or `Posting`.
- **Inputs / Textareas:** Soft cream-white backgrounds with input focus rings.
- **Platform Tab Pills (`.platformTab`):** Compact checked pill tab options showing the channel icon and identifier with transition animations.
- **ImagePicker Button (`.imageDropTarget`, `.circlePickerContainer`):** Compact circular gallery button with file upload chips. Drag-and-drop events are bound to the parent `.composeCard` so users can drop images anywhere in the compose input area.
- **Draft Navigation (`.draftPreviewControls`, `.carouselDots`):** Compact controls indicating the active draft. Mobile users can swipe the draft card; desktop users can use arrow buttons.
- **Bottom Bar Action Buttons (`.selectDateBtn`, `.postBtn`):** Flat, high-end buttons carrying calendar and paper airplane icon paths.

## Responsive Design
- Mobile (<768px): Single-column full-width shell. Sticky header with frosted `var(--bg)` backdrop keeps logo, avatar, and menu reachable while scrolling. The brand logo uses natural flexbox centering (`position: static; flex: 1`) so it never overlaps side controls. Nav menu opens as a fixed panel with a dimmed `uiOverlayBackdrop`, 44px-tall links, body scroll lock, and Escape to dismiss. Platform tabs use horizontal scroll with `scroll-snap-type: x proximity`. Cards use `--radius-lg` (24px) on mobile. Inputs/textareas use `16px` font size to prevent iOS zoom-on-focus. Draft carousel: swipe + 44px arrow buttons + enlarged dot hit targets + `carouselDots` tab buttons. Date-time picker uses a fixed centered popup, `cdtpBackdrop` scrim, 44px day/time controls, scroll lock, and Escape to close. Fixed bottom bars (`bottomActionBar`, `saveBar`) use frosted backgrounds with safe-area padding; page bottom padding follows `--mobile-fixed-bar-reserve`. Under 480px, compose footer stacks with a full-width Generate button; analytics hero and platform sparkline footer stack vertically.
- Mid-range (640–767px): `.pageShell` caps at `600px` and centers using `margin: 0 auto`. The `.settingsLayout` caps at 560px only in this narrow tablet range.
- Tablet / small laptop (768–1199px): `.pageShell` remains single-column and full width so the page background spans edge-to-edge.
- Desktop (>=1200px): `.pageShell` becomes a full-width two-column CSS grid (compose on the left, drafts on the right) with the header spanning both columns. `.composeSection` is sticky on scroll.
- Non-workspace route sections such as `/analytics` use `.section` to span the desktop grid and center the content rather than inheriting the two-column home composition.
- Color tokens are sourced from `context/design.json` (deep teal `#116A5A` brand, terracotta secondary, royal blue tertiary, warm cream background). No purple, blue-bright, or gradient fills; primary actions (`.generateBtn`, `.postBtn`) use solid `--accent` with `--accent-strong` hover.
- Toggle switch (`.toggleSwitch`) uses `--accent` for the on state.
