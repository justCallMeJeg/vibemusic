---
name: VibeMusic
description: A private, cross-platform desktop music player
colors:
  bg-dark: oklch(14.5% 0 0deg)
  bg-light: oklch(100% 0.0001 271.152deg)
  ink-dark: oklch(98.5% 0 0deg)
  ink-light: oklch(14.5% 0 0deg)
  card-bg-dark: oklch(14.5% 0 0deg)
  card-bg-light: oklch(100% 0 0deg)
  surface-secondary-dark: oklch(26.9% 0 0deg)
  surface-secondary-light: oklch(96% 0 0deg)
  muted-text-dark: oklch(70.8% 0 0deg)
  muted-text-light: oklch(46% 0 0deg)
  border-dark: oklch(26.9% 0 0deg)
  border-light: oklch(89.8% 0 0deg)
  destructive: oklch(57.7% 0.245 27.325deg)
  destructive-foreground-light: oklch(98.5% 0 0deg)
  destructive-foreground-dark: oklch(98.5% 0 0deg)
  sidebar-bg-dark: oklch(20.5% 0 0deg)
  sidebar-bg-light: oklch(97% 0 0deg)
  brand-indigo: oklch(48.8% 0.243 264.376deg)
typography:
  body:
    fontFamily: '"Instrument Sans", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-large:
    fontFamily: '"Instrument Sans", sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Instrument Sans", sans-serif'
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  tracking-small:
    fontFamily: '"Instrument Sans", sans-serif'
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.05em
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: oklch(98.5% 0 0deg)
    textColor: oklch(20.5% 0 0deg)
    rounded: 6px
    padding: 8px 16px
    typography: label
  button-ghost:
    backgroundColor: transparent
    textColor: oklch(70.8% 0 0deg)
    rounded: 6px
    padding: 8px
  slider-track:
    backgroundColor: oklch(100% 0 0deg / 0.2)
    rounded: 9999px
    height: 6px
  slider-thumb:
    backgroundColor: oklch(98.5% 0 0deg)
    rounded: 9999px
    size: 16px
  sidebar-nav-icon:
    size: 20px
    rounded: 6px
---
# Design System: VibeMusic

## 1. Overview

**Creative North Star: "The Dark Room"**

The app is a dark room where the music glows. When nothing plays, the interface recedes to near-invisibility — dark chrome, no ornament, no competing color. The moment music starts, album art fills the space with light: a dynamic gradient blooms from the cover colors, and the player bar becomes the focal point at the bottom of the screen.

This system explicitly rejects WinAmp's visual complexity, iTunes' dense table layouts, and the AI-template reflex of gradient text, glassmorphism-as-default, and numbered section markers. Every pixel earns its place; the interface answers a single question: *are you listening to music right now?* If yes, the art and metadata take center stage. If no, the app sits quiet and waits.

**Key Characteristics:**
- Dark-by-default, light as user choice. The physical scene is late-night listening — bedroom, dim light, focus on the sound.
- Achromatic shell (gray-to-black) gives the album art full color authority. The UI does not compete.
- Chrome uses tonal layering rather than shadows for depth. Surfaces separate by lightness, not drop-shadows.
- Glass morphism is used sparingly and intentionally — the player bar (the one persistent interactive element) gets a subtle translucent-backdrop treatment to float above the content.
- Profile color system lets users tint the chrome with their chosen hue, bringing the brand indigo through as an optional accent.

## 2. Colors: The Achromatic Shell

The palette is deliberately restrained — near-zero chroma in the neutral ramp, with color reserved for dynamic content (album art, the background gradient, profile accent, and chart visuals in insights).

### Primary (Dynamic)
- **Content Color** (dark: `oklch(98.5% 0 0deg)`, light: `oklch(14.5% 0 0deg)`): The text and primary interactive foreground. In dark mode, near-white; in light mode, near-black. Used for body text, headings, and default button text.

### Neutral
- **Background** (dark: `oklch(14.5% 0 0deg)`, light: `oklch(100% 0.0001 271.152deg)`): The canvas. Dark mode is a deep near-black; light mode is a pure white with a whisper of cool hue.
- **Surface Secondary** (dark: `oklch(26.9% 0 0deg)`, light: `oklch(96% 0 0deg)`): For secondary surfaces, muted elements, and input backgrounds in dark mode. One step up from the background.
- **Border** (dark: `oklch(26.9% 0 0deg)`, light: `oklch(89.8% 0 0deg)`): Subtle separators. In dark mode, the same as secondary surface — edges are implied rather than drawn.
- **Muted Text** (dark: `oklch(70.8% 0 0deg)`, light: `oklch(46% 0 0deg)`): Secondary information, timestamps, artist names, placeholder text.

### Accent (Profile-Driven)
- **Brand Indigo** (`oklch(48.8% 0.243 264.376deg)`): The most colorful token in the system. Used in the sidebar primary nav (dark mode), the title bar dot, and as the base for profile theme computation. When a user sets a profile color, this is the chroma target for the generated accent ramp.

### Destructive

- **Red** (`oklch(57.7% 0.245 27.325deg)`): The `--destructive` token. Used as the background for destructive buttons and as the text color for destructive indicators (`text-destructive` on neutral backgrounds).
- **Foreground** (dark/light: `oklch(98.5% 0 0deg)`): The `--destructive-foreground` token. Near-white text rendered on top of the destructive background (e.g., button labels). Provides ≥4.5:1 contrast against the red surface.

### Named Rules

**The One Chroma Rule.** The interface chrome carries zero chroma at rest. Color enters only through dynamic content (album art, background gradient) or explicit user choice (profile accent, data chart tokens). If a surface has chroma, it must be content, not chrome.

## 3. Typography

**Body Font:** Instrument Sans (with sans-serif fallback)

The entire app uses a single typeface — Instrument Sans — across all roles. This is a deliberate decision: the app is a tool, not a typographic showcase. A single family in multiple weights (400 body, 500 labels, 600 small tracking, 700 headings) provides enough hierarchy without introducing a second voice.

**Character:** Clean, slightly condensed geometric sans. Instrument Sans has warmth without being display-oriented — it reads well at text sizes and carries confidence at larger sizes. The app uses it at body scale almost exclusively; the few heading contexts (page titles) use bold weight at larger sizes.

### Hierarchy
- **Body** (Regular 400, 14px / 1.5): Default reading size. Used for track titles, album names, descriptions, settings text.
- **Body Large** (Regular 400, 16px / 1.5): The largest text size used in the app. Page titles, section headers.
- **Label** (Medium 500, 12px / 1.4): Button text, small metadata, sidebar labels.
- **Small Tracking** (Semibold 600, 11px / 1.2, 0.05em letter-spacing): Timestamps, durations, utility text that needs to compact without losing legibility.

### Named Rules
**The Single Face Rule.** No pairing, no contrast play. One family, four weight/scale combinations. Hierarchy comes from scale and weight, not from font switching. The album art provides all the typographic variety the interface needs.

## 4. Elevation

The system is flat by default — depth is conveyed through **tonal layering** rather than drop shadows. Each surface level gets its own background lightness value; moving "up" means moving to a lighter surface (dark mode) or a slightly separated surface (light mode).

The only exception is the music controller (player bar) at the bottom of the screen, which uses a subtle glass effect (`backdrop-blur-md` with a translucent `bg-popover/75` fill). This distinguishes the persistent control surface from the scrollable content above it.

### Shadow Vocabulary
No shadow tokens are defined. The application has no elements that use `box-shadow` by default. Components that need visual separation (dropdown menus, tooltips, modals) use tonal layering — their background is one step lighter (or darker) than the surface they sit on.

## 5. Components

### Buttons
- **Shape:** Gently rounded corners (6px radius). Compact, minimal padding.
- **Primary (dark mode):** Near-white background (`oklch(98.5% 0 0deg)`), near-black text. On hover, dims to 90% opacity.
- **Primary (light mode):** Near-black background (`oklch(20.5% 0 0deg)`), near-white text. On hover, dims to 90% opacity.
- **Ghost:** Transparent background, muted text. On hover, adds a subtle accent-tinted background fill (25% accent, dark-mode adapted). Used for icon-only sidebar navigation buttons.
- **Outline:** 1px border (`var(--border)`), transparent background. On hover, fills with primary background and inverts text. Used for secondary CTAs (GitHub button on landing, etc.).
- **Sizes:** Default (h-9, 36px), Small (h-8, 32px), Large (h-10, 40px), Icon (28-40px square).
- **Focus:** Ring-2 with `var(--ring)` color, consistent with the app's outline-ring utility.

### Slider
- **Track:** 6px height, fully rounded capsule shape, filled proportionally from the left with `var(--primary)`.
- **Thumb:** 16px circle, same color as track fill, with focus ring matching the ring token. Hover is implicit via the thumb's slight brightness shift.
- **Behavior:** Used for seek position, volume, and any continuous input. Responds on drag and commits on release.

### Navigation (Sidebar)
- **Style:** Fixed 64px (w-16) vertical strip on the left edge. Transparent background — the sidebar sits directly on the content canvas.
- **Icons:** Eight navigation icons (home, search, songs, albums, playlists, artists, insights, settings) plus a bottom-aligned import button. Each icon is 20px, centered in a ~36px box.
- **States:** Default shows muted foreground. Hover shows primary foreground with a subtle accent background fill. Active selection is visually indicated by the icon color change.
- **Tooltips:** Every icon has a right-anchored tooltip on hover, showing the section label. No labels at rest — the sidebar expands only on interaction.

### Music Controller (Player Bar)
- **Shape:** Full-width bar at the bottom of the screen. 4-column CSS grid layout. Rounded corners (8px) with subtle outline border.
- **Visual Treatment:** The signature glass-morphism element — translucent background (`bg-popover/75`), `backdrop-blur-md`. Slides up when a track is loaded, slides down (hidden) when idle.
- **Sections:** Left (album artwork + track title + artist, with marquee scroll for overflow), Center (playback controls + seek slider + time display), Right (volume slider + side panel toggle buttons).
- **Artwork:** Large album cover thumbnail (96px). The dynamic background gradient samples its dominant color.

### Side Panel (Queue / Lyrics / Track Info)
- **Style:** Right-side overlay panel, variable width. Scrollable content with the `scroll-mask-y` utility masking the bottom edge.
- **Background:** Uses `--popover` as its surface color, matching the player bar for continuity.
- **Tabs:** Tab-style headers at the top (Queue, Lyrics, Track Info). Active tab uses primary foreground; inactive uses muted foreground with a thin bottom border treatment.

### Inputs & Fields
- **Style:** 1px border (`var(--input)`), transparent or tinted background. Rounded corners (6px, `--radius-sm`).
- **Focus:** Ring-2 in ring color, replacing the border. No glow, no icon animation — a simple crisp ring.
- **Search Field:** Used in the global search command palette (via cmdk). Styled consistently with inputs, full-width with a search icon at left.

## 6. Do's and Don'ts

### Do:
- **Do** let album art and the dynamic background gradient be the primary color source on screen.
- **Do** use tonal layering (lighter backgrounds) to show hierarchy — never `box-shadow`.
- **Do** keep the sidebar receded (muted icons, no labels at rest) until the user needs it.
- **Do** use the glass effect (`backdrop-blur-md` + translucent fill) only on the player bar.
- **Do** ensure body text hits ≥4.5:1 against the background. Muted text must also pass 4.5:1 (not 3:1).
- **Do** support reduced motion: all animations must have a `prefers-reduced-motion` crossfade alternative.

### Don't:
- **Don't** use gradient text (`background-clip: text` with gradient). Single solid color for all headings.
- **Don't** use glassmorphism as the default surface treatment. It is reserved for the player bar only.
- **Don't** add `box-shadow` to any surface. Depth is conveyed by lightness, not by shadow.
- **Don't** use numbered section markers (01 / 02 / 03) or tiny uppercase tracked eyebrows above sections.
- **Don't** add side-stripe borders (colored `border-left` >1px on cards or list items). Use full background tints instead.
- **Don't** use two similar typefaces — the app uses one family across all roles.
- **Don't** replicate WinAmp's visual complexity or iTunes' table-heavy browsing. Give each content view (songs, albums, artists, playlists) its own distinct layout rhythm.
- **Don't** gate content visibility on a class-triggered animation. Content must render in its default state; animations enhance but never hide.
