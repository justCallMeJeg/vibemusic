---
name: VibeMusic Landing
description: Marketing landing page for VibeMusic desktop app
colors:
  bg: oklch(100% 0 0deg)
  ink: oklch(14.5% 0 0deg)
  primary: oklch(20.5% 0.042 265.755deg)
  primary-foreground: oklch(98.5% 0 0deg)
  card-bg: oklch(100% 0 0deg)
  secondary-surface: oklch(96.5% 0.001 286.375deg)
  muted-text: oklch(55.6% 0.013 286.375deg)
  border: oklch(92.2% 0.004 286.375deg)
  ring: oklch(20.5% 0.042 265.755deg)
  destructive: oklch(57.7% 0.245 27.325deg)
typography:
  display:
    fontFamily: '"Instrument Sans", "Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: clamp(2.25rem, 6vw, 3.75rem)
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.02em
  body:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.625
  body-muted:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Instrument Sans", "Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: oklch(20.5% 0.042 265.755deg)
    textColor: oklch(98.5% 0 0deg)
    rounded: 8px
    padding: 12px 24px
    typography: label
  button-outline:
    backgroundColor: transparent
    textColor: oklch(14.5% 0 0deg)
    borderColor: oklch(92.2% 0.004 286.375deg)
    rounded: 8px
    padding: 12px 24px
    typography: label
  feature-card:
    backgroundColor: oklch(100% 0 0deg)
    rounded: 12px
    padding: 16px
    borderColor: oklch(92.2% 0.004 286.375deg)
---
# Design System: VibeMusic Landing Page

## 1. Overview

**Creative North Star: "The Gallery"**

The landing page is a gallery — generous white space, each feature displayed like a framed exhibit. The visitor walks past each piece at their own pace, guided by a clear visual rhythm. The app screenshots are the art; the copy and the download CTA are the gallery label and exit through the gift shop.

This system rejects the AI-template landing — no glass cards, no numbered section markers (01 / 02 / 03), no tiny uppercase eyebrows above every section ("FEATURES", "DOWNLOAD"), no stock photography. It also rejects the SaaS cookie-cutter lane: no pricing tiers, no hero-metric layout, no "start free trial" rhythm. The landing feels like a product page for a well-designed instrument — confident enough to show its face and let the visitor decide.

**Key Characteristics:**
- White canvas (`oklch(100% 0 0deg)`) gives the indigo brand color maximum contrast. The indigo is the voice; white is the silence around it.
- Full-viewport hero with left-aligned content + right-side screenshot carousel on desktop, stacked on mobile.
- Cards have gentle shadow depth on hover — the only place in the design where `box-shadow` appears. At rest, cards use a thin border.
- Entrance animations are staggered but subtle — fade-up with 100ms delay increments. The visitor is eased into the page but not made to wait.
- Platform badges (Windows, macOS, Linux) are displayed prominently in the footer — cross-platform support is a brand signal, not a footnote.

## 2. Colors: The Indigo Gallery

The palette is restrained but committed — a deep indigo primary on a white canvas, with cool-tinted neutrals that side-step the default warm-cream AI palette.

### Primary
- **Deep Indigo** (`oklch(20.5% 0.042 265.755deg)`): The brand color. Used for the primary button, active/interactive elements, the ring/hover color, the hero heading gradient accent, icon fills in feature cards. This color carries the entire brand identity — it is the VibeMusic voice.
- **Primary Foreground** (`oklch(98.5% 0 0deg)`): Text on primary surfaces. Near-white for maximum contrast on the indigo button.

### Neutral
- **Background** (`oklch(100% 0 0deg)`): Pure white canvas. No tint, no warmth. The gallery wall.
- **Foreground / Ink** (`oklch(14.5% 0 0deg)`): Body and heading text. Near-black, neutral, no hue.
- **Secondary Surface** (`oklch(96.5% 0.001 286.375deg)`): A whisper-cool light gray. Used for decorative backgrounds, alternate rows, the feature card icon container backgrounds.
- **Muted Text** (`oklch(55.6% 0.013 286.375deg)`): Subdued copy — feature descriptions, footer text, version numbers. Cool-tinted to harmonize with the indigo.
- **Border** (`oklch(92.2% 0.004 286.375deg)`): Subtle separators, card outlines at rest. Cool-leaning, near-white.

### Destructive
- **Red** (`oklch(57.7% 0.245 27.325deg)`): For any destructive actions if the landing ever grows interactive forms (not currently used).

### Named Rules

**The Gallery Wall Rule.** The background is always pure white. No tints, no gradients, no patterns on the body canvas. Color enters through brand elements (primary button, icons) and content (screenshots, illustrations). The white is the frame, not the art.

## 3. Typography

**Display Font:** Instrument Sans (weight 700, with Inter fallback)
**Body Font:** Inter (weight 400, with system sans-serif fallback)

**Character:** A purposeful contrast pair. Instrument Sans (display) is a slightly condensed geometric sans with warmth — confident at large sizes, used exclusively for the hero heading and brand wordmark. Inter (body) is a neutral, highly legible sans — the workhorse for paragraphs, feature descriptions, and utility text. The pair shares enough DNA (both are geometric sans-serifs from the Swiss tradition) to feel cohesive while occupying distinct roles: Instrument Sans is the voice; Inter is the announcer.

### Hierarchy
- **Display** (Bold 700, `clamp(2.25rem, 6vw, 3.75rem)` / 1.08, -0.02em tracking): Hero headline only. The largest text on the page by a wide margin. Uses `text-wrap: balance` for even line lengths.
- **Body** (Regular 400, 16px / 1.625): Feature descriptions, hero subtitle, about text. Max line length 60ch.
- **Body Muted** (Regular 400, 14px / 1.5): Footer text, version strings, fine print.
- **Label** (Semibold 600, 13px / 1.3): Button text, interactive elements. Compact and readable at all sizes.

### Named Rules
**The One-Heading Rule.** The hero heading is the only Display-sized text on the page. No section headers are treated at display scale. All subsequent section headings are set at a title size (approximately 1.25–1.5rem, bold) — enough hierarchy to navigate, but the hero keeps its authority.

## 4. Elevation

The landing uses a hybrid approach: flat at rest, shadows on interaction.

- **Background canvas:** Flat, no elevation. All surfaces are flush with the page.
- **Buttons:** No shadow at rest. The primary button gains a subtle shadow on hover (`shadow-lg shadow-primary/20`) to signal affordance. The outline button stays flat.
- **Feature cards:** At rest, a featherweight border (`border-border/60`). On hover, the card lifts with `-translate-y-0.5` and gains `box-shadow` (`shadow-md`). This is the only shadow-driven hover in the system.

### Shadow Vocabulary
- **Card Hover** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Applied only to feature cards on hover. Gentle, compact — the card lifts but does not float.

## 5. Components

### Buttons
- **Shape:** Moderately rounded corners (8px radius). The primary download button extends leftward; the channel switcher extends rightward as a split button.
- **Primary:** Deep indigo background (`var(--primary)`), near-white text. Shadow on hover (`shadow-lg shadow-primary/20`) plus slight scale-up (`scale-[1.02]`).
- **Outline:** 1px solid border, transparent background, ink text. On hover, the background fills with the accent color and text inverts to the accent foreground.
- **Sizes:** Default (h-9, 36px), Large (h-10, 40px, with extended horizontal padding `px-8`).
- **Focus:** Ring-1 with `var(--ring)` color.

### Feature Cards
- **Corner Style:** 12px radius (`rounded-xl`). Slightly rounder than buttons to distinguish card surfaces from interactive elements.
- **Background:** Card white (`var(--card)`) on the white page canvas. Distinction comes from the border, not the fill.
- **Layout:** Horizontal flex layout — icon container on the left (40px square, 8px radius, indigo-tinted background at 8% opacity), text block on the right.
- **Hover:** Border tightens to primary color at 30% opacity. Card translates up 2px (`-translate-y-0.5`). Shadow appears as documented in Elevation.

### Download Split Button
- **Style:** Two-part button — the left section is a standard primary button (download label + version), the right section is a chevron trigger for the DropdownMenu. Visually joined: same background, separated by a 20%-opacity white divider line.
- **Dropdown:** Contains Stable Release and Nightly Build options, each with a letter avatar (S/N in a circle), version label, and description. Active channel gets a check icon. W-64 width, standard menu styling.

### Screenshot Carousel
- **Style:** Absolute-positioned element on desktop, hidden on mobile. Shows sequential screenshots of the app (homepage, lyrics view, insights view) with a 4-second auto-cycle.
- **Position:** Right third of the viewport, floated behind the hero content. A gallery preview — not a full interactive widget.

### Navigation (Header)
- **Style:** Logo wordmark (VibeMusic icon + "Vibe Music" text) at the top-left. Not a traditional nav bar — the landing is single-page with no internal navigation links. The logo is a brand anchor.
- **Footer:** Cross-platform badges (Windows, macOS, Linux) as icon + text pairs. Open-source license note. No social links or newsletter signup — the landing is a download page, not a community hub.

## 6. Do's and Don'ts

### Do:
- **Do** use pure white (`oklch(100% 0 0deg)`) as the canvas. No cream, no sand, no warm off-white.
- **Do** keep the hero as a single visual anchor — heading, subtitle, CTAs, screenshot carousel. No supplementary sections before the fold.
- **Do** stagger entrance animations (fade-in-up at 100ms delay increments) — they ease the visitor in without making them wait.
- **Do** show platform badges and open-source license in the footer. Cross-platform support is a brand asset.
- **Do** ensure body text hits ≥4.5:1 against the white background. Muted text must also pass 4.5:1.

### Don't:
- **Don't** use the AI-template landing reflexes: no glass cards, no numbered section markers (01 / 02 / 03), no tiny uppercase tracked eyebrows above every section ("FEATURES", "DOWNLOAD", "ABOUT").
- **Don't** use gradient text anywhere. No exceptions.
- **Don't** use side-stripe borders (colored `border-left` >1px on cards or list items).
- **Don't** add a pricing tier section, a "start free trial" CTA, or hero-metric statistics. This is a free, open-source desktop app landing, not a SaaS signup page.
- **Don't** gate content visibility on class-triggered animations. All sections are visible at rest; animations enhance but never hide.
- **Don't** use stock photography or placeholder imagery. The screenshots are the visual content.
- **Don't** use neutral body text that fails 4.5:1 contrast. Muted text is chroma-neutral at `oklch(55.6% 0.013 286.375deg)` — verify against the white canvas.
- **Don't** use dark mode by default. The landing is light-only; the dark app experience is a download reward, not a landing-page preview.
