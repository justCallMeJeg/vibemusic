# VibeMusic — Mobile Port Readiness

> **Status: Not ready — responsive-first strategy adopted**. The app is built as a Tauri v2 desktop application (minimum 1280×720) with deep CPAL audio dependencies and desktop-only UI patterns. The mobile port follows a **single responsive UI** strategy: one codebase, one set of components, adapted via responsive breakpoints and viewport-conditional layout switches. Full native port (iOS/Android with CPAL replacement) is estimated at **2–3 weeks** across 4 phases. The responsiveness layer alone is **~5–7 days**.

---

## Readiness Scorecard

| Layer | Readiness | Key Blockers |
|-------|-----------|-------------|
| React frontend | 35% | Layout shell, sidebar→bottom tabs, touch targets, hover patterns, gestures |
| Rust backend | 25% | CPAL audio out, souvlaki media controls, notify watcher, tray icon |
| Config & build | 10% | No mobile capability file, no Android/iOS config, no safe-area CSS |
| **Overall** | **~30%** | |

---

## Strategy: Single Responsive UI

**The UI is consistent regardless of platform.** Desktop and mobile share the same components, Zustand stores, Tauri commands, and layout shell. Only the arrangement changes with window size.

This is testable immediately by resizing the Tauri app window (no device or emulator needed). The app window can be dragged to phone widths (360px) to verify layout, touch targets, and content overflow before any native mobile build is attempted.

**What this enables:**
- Desktop users benefit from better window-resize behavior
- Narrow-window edge cases get fixed once, work everywhere
- The native mobile build (iOS/Android Tauri targets) inherits a working responsive UI
- Gestures and native interactions are the *only* mobile-specific layer, added last

### Responsive testing by window resize

| Label | Width | What to check |
|-------|-------|--------------|
| Max desktop | 1920px | Everything works as before — no regressions |
| Standard desktop | 1280px | Current baseline — all features functional |
| Tablet landscape | 1024px | Side panel → overlay, player bar starts wrapping |
| Tablet portrait | 768px | Sidebar → bottom tabs, slim player bar |
| Small tablet | 480px | Mini controls, always-visible overlays |
| Phone | 375px | Everything functional, no overflow, no clipping |

### Breakpoint constants

```ts
// src/hooks/use-media-query.ts
export const BREAKPOINTS = {
  sm: 640,   // Phone portrait → bottom tabs, mini player
  md: 768,   // Tablet portrait → sidebar collapses
  lg: 1024,  // Tablet landscape → side panel overlays
  xl: 1280,  // Desktop compact → standard layout
} as const;
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              Frontend (React 19)                │
│  Desktop: App.tsx shell (sidebar + content)     │
│  Mobile:  Needs bottom tab bar + mini player    │
├─────────────────────────────────────────────────┤
│           Tauri IPC (invoke) bridge             │
├─────────────────────────────────────────────────┤
│              Rust Backend (Tauri v2)            │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Audio    │ │ Library  │ │ Profile/Stats  │  │
│  │ (CPAL ✗) │ │ (SQLite) │ │ (portable)     │  │
│  ├──────────┤ ├──────────┤ ├────────────────┤  │
│  │ Watcher  │ │ Scanner  │ │ Media Controls │  │
│  │ (notify) │ │ (walkdir)│ │ (souvlaki ✗)   │  │
│  └──────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Green (portable)**: symphonia decoder, SQLite/rusqlite, reqwest HTTP, image processing, Zustand stores, most Tauri plugins.

**Red (desktop-only)**: CPAL audio output, souvlaki media controls, notify file watcher, system tray, multiple windows.

---

## Responsive Implementation Plan

The responsive pass covers **7 phases** focused on making the single UI adapt to any window size (360px–1920px). Each phase is independently testable by window resize. Stop at any phase and the app remains functional.

### Step 0 — Enable testing

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Remove minWidth/minHeight constraint | `tauri.conf.json:21-22` | Set `minWidth: 360, minHeight: 480` so you can shrink the window to phone widths. **This is temporary for testing; restore to 1280×720 for production desktop builds.** |
| Remove `visible: false` | `tauri.conf.json:23` | Set `visible: true` so the window doesn't start hidden |
| Create `useMediaQuery` hook | New: `src/hooks/use-media-query.ts` | Standard `matchMedia("(max-width: Xpx)")` hook with SSR safety. Exports `BREAKPOINTS` constants. |

**Testing**: After this step, resize the window below 1280px. Content area shrinks but no layout breaks yet.

---

### Phase 1 — Responsive Shell Layout

#### 1a. Sidebar → Bottom Tab Bar

The sidebar is a fixed `w-16` column. At narrow widths it must become a bottom tab bar.

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Wrap sidebar in responsive container | `src/App.tsx:295-300` | `<SidebarSection>` apply `max-md:hidden` to hide below 768px |
| Create `<BottomTabBar>` | New: `src/features/shell/components/bottom-tab-bar.tsx` | Reads same `sidebarItems` from `settings-store` (line 60 of navigation-menu.tsx) plus `labelMap` (lines 36-45). Renders 5 primary tabs: Home, Search, Albums, Playlists, Settings. Each tab: icon + `<span className="text-[10px] leading-tight">{label}</span>`. Height `h-16` + `pb-safe`. |
| Render BottomTabBar in App.tsx | `src/App.tsx` | Add after player bar, visible only at `max-md:`. Positioned `fixed bottom-0 left-0 right-0 z-50`. Adjust player bar bottom padding so content clears the tabs. |
| Profile avatar → header | `sidebar-section.tsx:21-46` | On mobile, move profile avatar into a top header row or into Settings tab |
| Import → FAB or settings page | `navigation-menu.tsx:97-116` | On mobile, add a floating "+" FAB above the tab bar, or move import into Settings |

**Testing**: Resize below 768px. Verify 5 tabs navigate correctly. Verify profile/import still accessible from Settings.

#### 1b. Side Panel → Overlay Sheet

The side panel is a `w-96` fixed panel. Below 1024px it should overlay the content.

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Create `<SlideOverPanel>` | New: `src/components/ui/slide-over-panel.tsx` | Radix Dialog positioned `right-0 top-0 h-full w-full max-w-sm` with `translate-x-full → translate-x-0` animation. Wraps existing `SidePanelContent`. |
| Conditionally render overlay vs inline | `src/App.tsx:317-332` | Below `max-lg:` (1024px), render `<SlideOverPanel>` instead of inline side panel div. Above that, keep current inline behavior. |
| Don't reserve `w-96` space when overlay is used | `src/App.tsx:321-322` | When side panel renders as overlay, don't add `w-96` to the layout — content fills the full width. |

**Testing**: Open side panel at 1280px → inline panel visible. Shrink below 1024px → panel slides in as overlay, dismisses on close.

#### 1c. Responsive Content Area Spacing

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Reduce horizontal padding at narrow widths | `src/App.tsx:286` | Change `px-6` to `px-6 max-md:px-4 max-sm:px-3` |
| Reduce gap between sidebar and content | `src/App.tsx:294` | Change `gap-6` to `gap-6 max-lg:gap-4 max-md:gap-0` (sidebar hidden at md, gap not needed) |
| Reduce content top padding on mobile | `src/App.tsx:294` | `pt-10 max-md:pt-12` (account for potential mobile header with safe area) |

#### 1d. Responsive Virtualized Grid Columns

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Extend `useGridColumns` to go down to 1 column | `virtualized-grid.tsx:26-60` | Add `< 480px → 1 column` for very narrow windows. Current: `else return 2`. Change to: `else if (width >= 480) return 2; else return 1;` |
| Reduce item height at narrow widths | `virtualized-grid.tsx:65` | Change `itemHeight = 220` to `itemHeight = 220 /* overridden to 180px at max-md: in CSS */` |
| Ensure grid doesn't overflow at 1 column | `virtualized-grid.tsx:152` | Verify `min-w-0` is on grid children to prevent overflow |

---

### Phase 2 — Responsive Player Bar

Current: `grid grid-cols-3 gap-4 p-4` with 96px artwork, 156px height. The bar doesn't reflow at any window size.

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Reduce artwork from 96px to 64px at all sizes | `music-controller.tsx:117-119` | Change `h-24` → `h-16`, `width/height={96}` → `{64}`. Smaller artwork looks better at every size and saves a full row of vertical space. |
| Replace rigid 3-column grid with responsive flex wrap | `music-controller.tsx:109` | Current: `grid grid-cols-3 grid-rows-1 gap-4 p-4`. New: `flex flex-wrap items-center gap-3 p-3`. The three sections (`#track`, `#controls`, `#actions`) wrap naturally when horizontal space runs out. |
| Controls row: collapse seeker at narrow widths | `music-controller.tsx:178-193` | At `max-md:`, time labels use `text-[10px]`, seek slider `max-w-full`. At `max-sm:`, hide time labels entirely, show only the slider bar. |
| Action buttons: condense at narrow widths | `music-controller.tsx:195-208` | At `max-md:`, hide sleep timer chip. At `max-sm:`, hide side panel action buttons (Queue, Lyrics, Track Details, Mini Player — they become available in full-screen now-playing). Keep volume slider. |
| Update player bar height CSS var for each breakpoint | `src/styles/globals.css:16` | Default: `--player-bar-height: 156px`. Override: `@media (max-width: 1024px) { --player-bar-height: 120px }`, `@media (max-width: 640px) { --player-bar-height: 80px }` |
| Scrolling text: change to hover trigger | `music-controller.tsx:124` | Change `trigger="always"` → `trigger="hover"`. The always-scrolling marquee is a distraction at all sizes — it should only scroll when the user is looking at the player bar. |

**Detailed layout maps**:

```
1920–1024px (full):  ┌───┬──────────────┬────────────────────┐
                      │64 │ Track info   │  Controls + seeker  │  Volume + actions │
                      │px │ + artist     │  (full width)       │                   │
                      └───┴──────────────┴────────────────────┘

1024–640px (compact): ┌───┬──────────────┐
                      │64 │ Track+artist  │  Play + next + vol │
                      │px │              │                    │
                      ├───┴──────────────┤
                      │   Seek slider (full width)             │
                      └────────────────────────────────────────┘

<640px (slim):        ┌──────┬──────────────────┬──────┐
                      │40px  │ Track title (1ln) │ ▶  ⏭ │
                      │ art  │ Artist (1ln)      │      │
                      ├──────┴──────────────────┴──────┤
                      │ ████████████░░░░░░░░░░░░░░░░░░ │  (2px progress bar)
                      └────────────────────────────────┘
```

#### Volume control responsive

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Remove fixed `w-36` width | `volume-control.tsx:19` | Change `w-36` → `w-36 max-md:w-24 max-sm:w-0 max-sm:overflow-hidden` |
| Collapse slider to icon-only at smallest widths | `volume-control.tsx:34-40` | At `max-sm:`, show only the mute/unmute button. The volume slider moves to the full-screen now-playing view. |

#### Side panel actions responsive

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Condense action icons at narrow widths | `side-panel-actions.tsx:18` | Add `max-md:[&>button:nth-child(n+3)]:hidden max-md:[&>button:nth-child(n+3)]:pointer-events-none` to hide mini-player and panel toggles beyond the second icon |

---

### Phase 3 — Touch Targets ≥44px

Minimum touch target: **44×44pt** (WCAG 2.2, Apple HIG, Material Design).

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Add `mobile` and `icon-mobile` size variants | `button-variants.ts:19-26` | Add `mobile: "h-11 min-w-[44px] px-5 py-3 has-[>svg]:px-4"` and `"icon-mobile": "size-11"` |
| Fix mini-player 28px buttons | `mini-player.tsx:254,267` | Change `h-7 w-7` → `h-11 w-11 size-11`. These are unusably small. |
| Playback controls at mobile size | `playback-controls.tsx:40-112` | All `Button variant="ghost"` — at `max-sm:`, add className `size-11` or use `icon-mobile` variant |
| Seek bar touch area | Slider component | Add `min-h-[44px]` at `max-sm:`. Current track `h-2` (8px) is too small for touch drag. |
| Checkbox invisible touch padding | `card-item.tsx:245`, `list-item.tsx:73` | Add `before:absolute before:inset-[-14px]` so the 16px checkbox has a 44px effective hit area |

**Strategy**: Override button sizes at the mobile breakpoint via a CSS custom property:

```css
/* globals.css */
@layer base {
  @media (max-width: 640px) {
    .btn { min-height: 44px; min-width: 44px; }
  }
}
```

---

### Phase 4 — Hover-to-Always-Visible Controls

The `group-hover` pattern (31 instances) hides play buttons, like buttons, and drag handles behind hover. On touch (or narrow-window testing via mouse), these are invisible.

**Strategy**: Use a Tailwind v4 `@custom-variant hoverable` to gate hover effects behind `@media (hover: hover) and (pointer: fine)`. The default (no hover) state becomes always-visible.

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Add `hoverable` variant | `src/styles/globals.css` | `@custom-variant hoverable (@media (hover: hover) and (pointer: fine));` |
| Card play overlay | `card-item.tsx:222-242` | `opacity-0 group-hover:opacity-100` → `opacity-100 hoverable:opacity-0 hoverable:group-hover:opacity-100` |
| Card artwork scale | `card-item.tsx:80,90,99` | `group-hover:scale-[1.02]` → `hoverable:group-hover:scale-[1.02]` (removed on touch) |
| ListItem index → play swap | `list-item.tsx:81-99` | `group-hover:hidden` / `hidden group-hover:block` → index always hidden on touch, play always shown |
| ListItem like button | `list-item.tsx:142,370` | `group-hover/like:opacity-100` → `opacity-100 hoverable:opacity-0 hoverable:group-hover/like:opacity-100` |
| MiniPlayer hover reveals | `mini-player.tsx:168,237,298,305,356,360` | `group-hover:opacity-100` → `opacity-100 hoverable:opacity-0 hoverable:group-hover:opacity-100` |
| Settings remove button | `settings-library.tsx:195` | `group-hover:opacity-100` → always visible on touch |
| Playlist grip handle | `playlist-detail-page.tsx:164,168,171` | `group-hover:opacity-100` → always visible on touch |
| Profile edit overlay | `profile-manage-dialog.tsx:152` | `group-hover:opacity-100` → always visible on touch |
| Profile card hover effects | `profile-selection-page.tsx:32,36,120,137,138,140` | Scale/shadow effects → `hoverable:group-hover:` prefix |

**Testing**: At each breakpoint (especially 480px and below), every interactive element must be visible without hovering. Cards show play buttons. List items show play icons and like buttons. Settings show remove buttons.

---

### Phase 5 — CSS Infrastructure

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Add safe area CSS variables | `src/styles/globals.css` | `--sat: env(safe-area-inset-top)`, `--sab: env(safe-area-inset-bottom)`, `--sal`, `--sar`, gated behind `@supports (padding: env(safe-area-inset-bottom))` |
| Apply safe area to bottom tab bar | bottom-tab-bar | `padding-bottom: var(--sab, 0px)` |
| Add `touch-action: manipulation` | `src/styles/globals.css` | `@media (max-width: 1024px) { * { touch-action: manipulation; } }` — prevents 300ms tap delay, disables double-tap zoom |
| Add `-webkit-tap-highlight-color: transparent` | `src/styles/globals.css` | Remove default grey tap highlight on mobile WebKit |
| Define responsive player bar height overrides | `src/styles/globals.css` | `@media (max-width: 1024px) { --player-bar-height: 120px }`, `@media (max-width: 640px) { --player-bar-height: 80px }` |
| Add `hoverable` variant | `src/styles/globals.css` | `@custom-variant hoverable (@media (hover: hover) and (pointer: fine));` |
| Bottom tab bar CSS vars | `src/styles/globals.css` | `--bottom-tab-height: 64px;` with `@media (max-width: 640px)` override |

---

### Phase 6 — Responsive Content Views

| View | File | Issue | Fix |
|------|------|-------|-----|
| Album detail page | `detail-page-template.tsx` | Fixed-width header layout | Add `flex-col max-md:flex-col` to stack header vertically at narrow widths |
| Artist detail page | artist detail components | Side-by-side layout | Convert to single-column at `max-lg:` |
| Settings pages | `settings-*.tsx` | Multi-column form layouts | Add `grid-cols-1 max-md:grid-cols-1` to form sections |
| Playlist detail | `playlist-detail-page.tsx` | Header with artwork + metadata | Add `flex-col max-md:flex-col` at narrow widths |
| Home page sections | `home-page.tsx` | Horizontal scroll sections | Ensure sections show max 2 columns at narrow widths |

---

### Phase 7 — Titlebar on Mobile

| Action | File | Lines | Detail |
|--------|------|-------|--------|
| Hide close/minimize/maximize buttons | `titlebar.tsx` | At `max-md:`, add `hidden` class to action button container |
| Keep drag region for window move | `titlebar.tsx:40-70` | The `data-tauri-drag-region` is useful even on mobile (some Tauri mobile windows are draggable). Only hide on actual mobile native builds. |

---

### Implementation Order (recommended sprint)

```
Day 1  — Step 0 (min window) + Phase 1a (sidebar→tabs) + Phase 1b (side panel→overlay)
Day 2  — Phase 1c+d (responsive spacing + grid) + Phase 2 (player bar)
Day 3  — Phase 3 (touch targets) + Phase 7 (titlebar)
Day 4  — Phase 4 (hover patterns) — 31 locations across 10+ files
Day 5  — Phase 5 (CSS infra) + Phase 6 (content views) + testing pass
```

After each day, resize the window to all 6 breakpoints (1920, 1280, 1024, 768, 480, 375) and fix regressions before continuing.

---

### File Change Summary (responsive pass only)

| File | Phase | Change |
|------|-------|--------|
| `tauri.conf.json` | 0 | Remove minWidth/minHeight/visible-false constraints |
| New: `src/hooks/use-media-query.ts` | 0 | Breakpoint hook with `BREAKPOINTS` constants |
| `src/styles/globals.css` | 0,5 | `hoverable` variant, safe areas, `touch-action`, bar height overrides |
| `src/App.tsx` | 1a,1b,1c | Conditional sidebar, side panel overlay, responsive spacing |
| New: `src/features/shell/components/bottom-tab-bar.tsx` | 1a | Bottom navigation, reads `sidebarItems` from store |
| New: `src/components/ui/slide-over-panel.tsx` | 1b | Slide-in overlay panel (Radix Dialog) |
| `src/features/shell/components/sidebar-section.tsx` | 1a | `max-md:hidden` |
| `src/components/shared/virtualized-grid.tsx` | 1d | Column count down to 1, item height at narrow widths |
| `src/features/player/components/music-controller.tsx` | 2 | Responsive flex layout, 64px artwork, hover marquee |
| `src/features/player/components/volume-control.tsx` | 2 | Remove fixed width, collapse at smallest sizes |
| `src/features/shell/components/side-panel-actions.tsx` | 2 | Condense at narrow widths |
| `src/components/ui/button-variants.ts` | 3 | `mobile` + `icon-mobile` size variants |
| `src/features/player/components/mini-player.tsx` | 3 | Fix 28px buttons → 44px |
| `src/features/player/components/playback-controls.tsx` | 3 | Icon buttons at mobile size |
| `src/components/shared/card-item.tsx` | 4 | Play overlay: always visible on touch |
| `src/components/shared/list-item.tsx` | 4 | Index/play swap, like button: always visible on touch |
| `src/features/shell/components/titlebar.tsx` | 7 | Hide window buttons on mobile |
| `src/components/shared/scrolling-text.tsx` | 2 | `trigger="always"` → `trigger="hover"` |
| `src/hooks/use-media-query.ts` | 0 | New file |

**Total: ~18 files changed, ~4 new files created** (bottom-tab-bar, slide-over-panel, use-media-query).

---

## Phase 1 — Rust Backend: Gate Desktop Dependencies

### Crate Migration

Current `Cargo.toml` has all dependencies in the global `[dependencies]` section (lines 21–55) and an empty `[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]` section (line 57). The following crates must move:

| Crate | Current line | Status | Action |
|-------|-------------|--------|--------|
| `cpal` | 33 | ❌ desktop-only | Move to desktop-only deps |
| `ringbuf` | 34 | ❌ desktop-only (CPAL coupling) | Move with CPAL |
| `souvlaki` | 35 | ❌ desktop-only | Move to desktop-only deps |
| `raw-window-handle` | 36 | ❌ desktop-only (souvlaki coupling) | Move with souvlaki |
| `notify` | 46 | ❌ desktop-only | Move to desktop-only deps |
| `open` | 55 | ❌ desktop-only | Move to desktop-only deps |
| `discord-rich-presence` | 52 | ❌ optional, desktop-only | Move behind desktop cfg |
| `walkdir` | 29 | ⚠️ works on mobile, but sandboxed | Replace with MediaStore queries or keep with scope |
| `tauri` (`tray-icon` feature) | 22 | ❌ `tray-icon` feature desktop-only | Split feature: `features = ["protocol-asset"]` on mobile |

### Desktop-only deps section (to populate)

```toml
[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
cpal = "0.15"
ringbuf = "0.4"
souvlaki = "0.8"
raw-window-handle = "0.6"
notify = "8"
open = "5"
discord-rich-presence = { version = "1", optional = true }
```

### `tauri` feature split

```toml
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }

[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
tauri = { version = "2", features = ["protocol-asset", "tray-icon"] }
```

> **Wait — this doesn't work.** Cargo doesn't allow the same crate in both `[dependencies]` and target-specific deps. Instead, keep `tauri` in `[dependencies]` with shared features, and use `#[cfg(desktop)]` in code to guard tray-icon usage:

```toml
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
# tray-icon is desktop-only; guard in code with #[cfg(desktop)]
```

Then in `lib.rs`:

```rust
#[cfg(desktop)]
use tauri::tray::TrayIconBuilder;
```

### Code changes: `lib.rs` (lines 56–137)

| Lines | What | Change |
|-------|------|--------|
| 88–134 | TrayIconBuilder + MenuItem + set_show_event | Wrap entire block in `#[cfg(desktop)]` |
| 114–117 | `get_webview_window("main").show()` | Wrap in `#[cfg(desktop)]` |
| 128–131 | `window.show()`, `window.set_focus()` | Wrap in `#[cfg(desktop)]` |
| 33 | `#[cfg_attr(mobile, tauri::mobile_entry_point)]` | ✅ Already correct |

### Code changes: Audio engine (`src-tauri/src/audio/`)

| File | Lines | What | Change |
|------|-------|------|--------|
| `engine.rs` | 18–39 | souvlaki MediaControls + HWND | Gate entire block with `#[cfg(desktop)]` |
| `worker/mod.rs` | 17–18, 85–94 | CPAL device initialization | Gate with `#[cfg(desktop)]` |
| `worker/stream_manager.rs` | 3, 23–34, 79–144 | CPAL stream creation | Gate entire file with `#[cfg(desktop)]` |
| `commands.rs` | 4, 59 | CPAL device enumeration for `audio_get_devices` | Gate with `#[cfg(desktop)]`; return empty on mobile |

### Audio on mobile

CPAL has no Android/iOS backend. Two options:

**Option A: Write native audio output modules** (2–3 weeks)
- Android: Oboe (C++ via JNI) or `aaudio` sys crate
- iOS: `AVAudioEngine` via `objc2` bindings
- Shared trait: `trait MobileAudioOutput { fn play(&mut self, buf: &[f32]); fn pause(&mut self); fn resume(&mut self); }`
- Symphonia decoder stays untouched — feeds PCM to either CPAL (desktop) or MobileAudioOutput (mobile)

**Option B: Wait for community plugin** (ongoing)
- Tauri community has discussed `tauri-plugin-audio` but no stable release as of mid-2026
- Monitor: https://github.com/tauri-apps/plugins-workspace

### Code changes: Watcher (`src-tauri/src/watcher.rs`)

| Lines | What | Change |
|-------|------|--------|
| 2 | `use notify::{...}` | Gate behind `#[cfg(desktop)]` |
| entire file | notify-based FS watcher | On mobile, skip or replace with polling via `walkdir` on app-private dirs |

---

## Phase 2 — Frontend Layout Overhaul

### 2a. Responsive shell (`src/App.tsx`)

Current layout (lines 283–361):
```
TitleBar (fixed top, h-10, z-50)
Content row (flex flex-1, pt-10)
  ├─ Sidebar (w-16, fixed 64px)
  ├─ Main content (flex-1)
  └─ Side panel (w-96, optional)
Player bar (fixed bottom, 156px, z-50)
```

Mobile layout target:
```
StatusBar safe area
┌─────────────────┐
│ Header (h-12)   │ ← back/search/actions
├─────────────────┤
│                 │
│ Main content    │ ← flex-1, scrollable
│                 │
├─────────────────┤
│ Mini player     │ ← h-14, slim now-playing
│ Bottom tab bar  │ ← h-16, 5 icons + labels
└─────────────────┘
Home indicator safe area
```

**Checklist:**

- [ ] Create `useIsMobile()` hook: `window.matchMedia("(max-width: 640px)").matches`
- [ ] Create `LayoutShell` component that switches between `DesktopLayout` and `MobileLayout` based on hook
- [ ] `DesktopLayout`: current shell (sidebar + content + side panel + player bar)
- [ ] `MobileLayout`: header + scrollable content + mini player + bottom tab bar
- [ ] Remove TitleBar on mobile (minimize/maximize/close have no mobile equivalent)
- [ ] Hide side panel on mobile; replace with overlay sheet triggered from bottom tabs
- [ ] Set `overflow-x-hidden` at root to prevent horizontal scroll on narrow viewports

### 2b. Bottom Tab Bar (replaces sidebar)

Current sidebar: 8 icon-only nav items with tooltips, profile avatar top, import bottom.

Mobile bottom tab bar:
- 5 tabs: Home, Search, Library, Playlists, Settings
- Each tab: icon + label below (11px tracking, same as Desktop's--muted-foreground)
- Active tab: `--primary` foreground, inactive: `--muted-foreground`
- Height: `h-16` (64px) + `pb-safe` for home indicator
- Profile avatar → settings/header area
- Import → settings page or FAB (`+`) button above tab bar

**Checklist:**

- [ ] Create `BottomTabBar` component in `src/features/shell/components/`
- [ ] Build nav items from same `sidebarItems` config in `settings-store` (filter to 5 primary entries)
- [ ] Use `useLocation()` or a nav store to track active tab
- [ ] Add `pb-safe` via CSS: `padding-bottom: env(safe-area-inset-bottom, 0px)`
- [ ] Move profile avatar from sidebar to a header avatar or settings page
- [ ] Move Import to a floating action button or settings page

### 2c. Mini Player (replaces 156px player bar)

Current player bar: 156px, 96px artwork, 3-column grid (track info / controls / volume+actions).

Mobile mini-player target:
- Height: `h-14` (56px) or `h-16` (64px)
- Layout: art (40px) | track title + artist | play/pause | next | progress bar (thin line)
- Tap mini-player → full-screen now-playing view
- Volume slider → full-screen now-playing only
- Side panel buttons (queue, lyrics, track info) → full-screen now-playing
- Sleep timer → accessible from full-screen now-playing

**Checklist:**

- [ ] Create `MobileMiniPlayer` component
- [ ] Reduce artwork to 40px square
- [ ] Show track title + artist (single-line truncation, not marquee)
- [ ] Show play/pause + next as touch targets ≥44px
- [ ] Add thin progress bar at top edge (2px, `--primary` fill)
- [ ] Build `FullScreenNowPlaying` component (triggered by tap on mini-player):
  - Large artwork (centered, ~70% of width)
  - Track title + artist
  - Seek bar (h-6 min-h-[44px] for touch)
  - Playback controls row
  - Volume slider
  - Queue / Lyrics / Track Info tabs
  - Sleep timer
  - Swipe-down to dismiss
- [ ] Add gesture support: swipe left/right on full-screen view changes track

### 2d. Eliminate `group-hover` patterns

31 `group-hover` instances across 10+ components that are invisible on touch:

| Component | File | Pattern | Mobile Fix |
|-----------|------|---------|------------|
| CardItem | `card-item.tsx:80,90,99` | `group-hover:scale-[1.02]` | `active:scale-[1.02]` or remove |
| CardItem | `card-item.tsx:223` | `group-hover:opacity-100` play overlay | Show play button always on mobile |
| ListItem | `list-item.tsx:81-96` | Index hides, play icon appears on hover | Always show play icon on mobile |
| ListItem | `list-item.tsx:142,370` | Like button on hover | Always visible on mobile |
| MiniPlayer | `mini-player.tsx:168,237,298,305,356,360` | Volume slider, handles on hover | Always visible on mobile |
| PlaylistDetail | `playlist-detail-page.tsx:164,168,171` | Grip/index swap on hover | Always show grip + play on mobile |
| ProfileManage | `profile-manage-dialog.tsx:152` | Edit overlay on hover | Show edit button always on mobile |
| SettingsLibrary | `settings-library.tsx:195` | Remove button on hover | Always visible on mobile |
| ProfileSelection | `profile-selection-page.tsx:32,36,120,137,138,140` | Card hover effects | Keep `active:` equivalents |

**Strategy**: Wrap hover-dependent styles in `@media (hover: hover) and (pointer: fine)`:

```css
/* Desktop only — hover reveals play button */
@media (hover: hover) and (pointer: fine) {
  .group:hover .play-overlay { opacity: 1; }
}

/* Mobile — always show play button */
@media (hover: none) {
  .play-overlay { opacity: 1; }
}
```

Or use the Tailwind v4 approach with `max-sm:` modifiers and a custom variant:

```css
@custom-variant hoverable (@media (hover: hover) and (pointer: fine));
```

Then: `hoverable:opacity-100` for desktop, and always-visible defaults for mobile.

**Checklist:**

- [ ] Add `@custom-variant hoverable` to `globals.css`
- [ ] Audit all 31 `group-hover` locations and add `hoverable:` prefix
- [ ] Override each with mobile-appropriate visible defaults (always-visible play buttons, like buttons, etc.)
- [ ] Remove or replace `hover:scale` with `active:scale` on touch devices

### 2e. Touch Targets

Minimum touch target: **44×44pt** (WCAG 2.2, Apple HIG, Material Design).

| Current size | px at 16px base | Used in | Must become |
|-------------|-----------------|---------|-------------|
| `h-7 w-7` | 28px | MiniPlayerBar play buttons | `h-11 w-11` (44px) |
| `h-8 w-8` | 32px | sm buttons, icon-sm, badges, mini-player close | `h-11 w-11` (44px) or `min-h-[44px] min-w-[44px]` |
| `h-9 w-9` | 36px | default buttons, icon default | `h-11 w-11` or add `size-11` variant |
| `size-4` | 16px | Checkboxes in batch actions | Keep visual 16px, add 14px invisible touch padding |

**Strategy**: Add mobile button variants and override at breakpoint:

```ts
// button-variants.ts
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-8 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
        "mobile": "h-11 min-w-[44px] px-5 py-3 has-[>svg]:px-4", // ADD
        "icon-mobile": "size-11", // ADD
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);
```

Then apply `size="mobile"` on touch devices via a hook or override in the shell.

**Checklist:**

- [ ] Add `mobile` and `icon-mobile` size variants to `buttonVariants`
- [ ] Audit all `h-7`, `h-8`, `h-9` buttons for mobile overrides
- [ ] Add `padding: max(44px, 100%)` guardrail CSS for all interactive elements
- [ ] Replace `h-7 w-7` in `mini-player.tsx` with `size-11`
- [ ] Add invisible touch padding to checkboxes: `before:absolute before:inset-[-14px]`
- [ ] Increase seek bar touch area: `min-h-[44px]` instead of `h-2`

---

## Phase 3 — Gestures & Touch Interactions

### What's missing

The app currently has **zero** touch gesture support. No swipe, no pan, no pull-to-refresh, no long-press.

### Required additions

| Gesture | Component | Implementation |
|---------|-----------|---------------|
| Swipe-to-seek | Full-screen now-playing | Track horizontal drag on seek bar |
| Swipe left/right | Full-screen now-playing | Change track via `onPanEnd` |
| Swipe-down dismiss | Full-screen now-playing, dialog sheets | `onPan` with threshold |
| Pull-to-refresh | Library views (albums/tracks/artists) | Scroll-overscroll trigger |
| Swipe-to-reveal | ListItem actions (add to queue, remove) | Horizontal reveal |
| Long-press | Cards/lists | Trigger context menu bottom sheet |
| Double-tap | Full-screen now-playing | Toggle like/favorite |

### Library options

| Library | Pros | Cons |
|---------|------|------|
| `@use-gesture/react` | Purpose-built for gestures; small bundle; works with React | Not yet in deps |
| `framer-motion` gestures | Already considered for animation; has drag/pan | Heavier (but may already be considered) |
| Raw pointer/touch events | Zero deps | Error-prone; need to handle both touch and mouse |

**Recommendation**: `@use-gesture/react` (12 kB gzip) for gesture handling. It pairs naturally with the existing React setup.

**Alternative**: The `@dnd-kit` already in deps has `TouchSensor` and `PointerSensor`. Configure them for drag-to-reorder on mobile:

```ts
import { TouchSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

// In sortable list component:
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
);
```

**Checklist:**

- [ ] Install `@use-gesture/react`
- [ ] Add swipe-to-seek on `FullScreenNowPlaying` seek bar
- [ ] Add swipe left/right track change on `FullScreenNowPlaying` artwork
- [ ] Add pull-to-refresh to virtualized library views
- [ ] Configure `@dnd-kit` TouchSensor for playlist reordering on mobile
- [ ] Add `touch-action: manipulation` to all interactive elements (`globals.css`)

---

## Phase 4 — Config, Build & Polish

### 4a. Capabilities

Create `src-tauri/capabilities/mobile.json`:

```json
{
  "$schema": "../gen/schemas/mobile-schema.json",
  "identifier": "mobile-capability",
  "platforms": ["android", "ios"],
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:app:default",
    "core:path:default",
    "opener:default",
    "log:default",
    "process:default",
    "fs:scope",
    "fs:default",
    "fs:allow-read",
    "fs:allow-write",
    "fs:allow-appdata-write",
    "store:default",
    "dialog:default",
    {
      "identifier": "fs:scope",
      "allow": ["$APPDATA/**", "$APPLOCALDATA/**"]
    },
    {
      "identifier": "opener:allow-open-path",
      "allow": [
        { "path": "$APPLOCALDATA/logs" },
        { "path": "$APPLOCALDATA/logs/**" }
      ]
    }
  ]
}
```

Note what's excluded vs `default.json`:
- ❌ No `core:window:allow-*` (window management is desktop-only)
- ❌ No `core:tray:default`
- ❌ No `updater:default` (move updater to `desktop.json` or add mobile support separately)

**Checklist:**

- [ ] Create `src-tauri/capabilities/mobile.json`
- [ ] Update `default.json` to not reference desktop schema — or remove `default.json` and use separate mobile/desktop files
- [ ] Move `updater:default` from `default.json` to `desktop.json`

### 4b. `tauri.conf.json` mobile section

```json
{
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Vibe Music",
        "width": 1280,
        "height": 720,
        "minWidth": 1280,
        "minHeight": 720,
        "visible": false
      }
    ],
    "security": { "...existing..." }
  },
  "mobile": {
    "ios": {
      "minimumSystemVersion": "16.0",
      "capabilities": [
        { "name": "audio", "reason": "Play audio files from the user's library" }
      ]
    },
    "android": {
      "minimumSdkVersion": "26",
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "READ_MEDIA_AUDIO"
      ]
    }
  }
}
```

**Checklist:**

- [ ] Add `mobile.ios` section with basic iOS config
- [ ] Add `mobile.android` section with basic Android config
- [ ] Remove `miniplayer` window from mobile builds (single-window mobile)
- [ ] Set `"visible": true` on mobile (no tray-based show/hide)
- [ ] Remove `"decorations": false` on mobile (or keep if using custom title bar)
- [ ] Generate Tauri mobile project files: `pnpm tauri android init && pnpm tauri ios init`

### 4c. CSS: Safe area & viewport

Add to `src/styles/globals.css`:

```css
/* Safe area insets for notched devices */
@supports (padding: env(safe-area-inset-bottom)) {
  :root {
    --sat: env(safe-area-inset-top);
    --sar: env(safe-area-inset-right);
    --sab: env(safe-area-inset-bottom);
    --sal: env(safe-area-inset-left);
  }
}

/* Touch-friendly defaults on mobile */
@media (max-width: 640px) {
  :root {
    --player-bar-height: 64px; /* slim mini-player */
    --bottom-tab-height: 64px;
  }

  * {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
}
```

**Checklist:**

- [ ] Add safe-area CSS variables
- [ ] Apply `pb-[var(--sab)]` to bottom tab bar
- [ ] Apply `pt-[var(--sat)]` to header/status bar area
- [ ] Add `touch-action: manipulation` to interactive elements
- [ ] Remove page zoom on double-tap via `touch-action`
- [ ] Test that `100dvh` works for viewport height (Tauri v2 mobile)

### 4d. Components that need mobile variants

| Component | Desktop | Mobile | Effort |
|-----------|---------|--------|--------|
| Dialog | Centered modal | Full-screen slide-up sheet | Low |
| AlertDialog | Centered modal | Full-screen slide-up sheet | Low |
| DropdownMenu | Dropdown list | Action sheet (bottom) | Low |
| ContextMenu | Right-click menu | Long-press → action sheet | Medium |
| Tooltip | Hover tooltip | Persistent label or none | Low |
| Empty state | Centered message | Centered with larger icon | Low |
| Skeleton grid | `grid-cols-2/3/4/5` | `grid-cols-2` | Low |
| VirtualizedGrid | `useGridColumns()` | Always 2 columns on mobile | Low |

### 4e. Components that don't exist yet (must create)

| Component | Purpose |
|-----------|---------|
| `Sheet.tsx` | Slide-up panel (Radix Dialog configured for bottom entry) |
| `BottomTabBar.tsx` | 5-tab navigation bar with icons + labels |
| `MobileMiniPlayer.tsx` | Slim 56px now-playing bar |
| `FullScreenNowPlaying.tsx` | Full-screen player with artwork + seek + gestures |
| `MobileActionSheet.tsx` | List of actions as a bottom sheet (replaces dropdown/context menu) |
| `useIsMobile.ts` | Hook returning `matchMedia("(max-width: 640px)").matches` |
| `MobileLayoutShell.tsx` | Wraps header + content + mini-player + tabs |

---

## Reference: File Change Index

### Rust (`src-tauri/`)

| File | Phase | Change |
|------|-------|--------|
| `Cargo.toml` | 1 | Move 6 deps to cfg-gated section; split tauri tray-icon feature |
| `src/lib.rs` | 1 | Gate tray + window setup behind `#[cfg(desktop)]` |
| `src/audio/engine.rs` | 1 | Gate souvlaki + HWND behind `#[cfg(desktop)]` |
| `src/audio/worker/mod.rs` | 1 | Gate CPAL init behind `#[cfg(desktop)]` |
| `src/audio/worker/stream_manager.rs` | 1 | Gate entire file behind `#[cfg(desktop)]` |
| `src/audio/commands.rs` | 1 | Gate `audio_get_devices` CPAL usage |
| `src/watcher.rs` | 1 | Gate notify behind `#[cfg(desktop)]` |
| New: `src/audio/mobile.rs` | 1 | Mobile audio output trait + Oboe/AVAudioEngine bridge |
| `capabilities/default.json` | 4 | Remove window/tray permissions from mobile scope |
| New: `capabilities/mobile.json` | 4 | Mobile-appropriate permissions |
| `tauri.conf.json` | 4 | Add `mobile` section; remove miniplayer window on mobile |

### Frontend (`src/`)

| File | Phase | Change |
|------|-------|--------|
| `App.tsx` | 2, R1 | Responsive shell: conditional sidebar, side panel overlay, spacing |
| `styles/globals.css` | 2,4, R5 | Safe-area vars, `hoverable` variant, `touch-action`, bar height overrides |
| New: `hooks/use-media-query.ts` | R0 | `matchMedia` hook + `BREAKPOINTS` constants |
| New: `hooks/use-is-mobile.ts` | 2 | `matchMedia("(max-width: 640px)")` (alias for parity) |
| New: `components/layout/mobile-layout-shell.tsx` | 2 | Mobile shell wrapper |
| New: `components/layout/desktop-layout-shell.tsx` | 2 | Desktop shell wrapper (extracted from App.tsx) |
| New: `components/layout/bottom-tab-bar.tsx` | 2, R1a | Bottom tab nav, reads `sidebarItems` from store |
| New: `components/ui/slide-over-panel.tsx` | R1b | Side panel as slide-in overlay (Radix Dialog) |
| New: `features/player/components/mobile-mini-player.tsx` | 2 | Slim now-playing bar |
| New: `features/player/components/full-screen-now-playing.tsx` | 2 | Full-screen player |
| New: `components/ui/sheet.tsx` | 2,4 | Slide-up sheet (Radix Dialog) |
| New: `components/ui/mobile-action-sheet.tsx` | 3,4 | Action list sheet |
| `components/ui/dialog.tsx` | 4 | Add full-screen variant on mobile |
| `features/shell/components/sidebar-section.tsx` | 2, R1a | `max-md:hidden` |
| `features/shell/components/navigation-menu.tsx` | 2 | Data drives bottom tab bar |
| `features/player/components/music-controller.tsx` | 2, R2 | Responsive flex layout, 64px artwork, hover marquee |
| `features/player/components/volume-control.tsx` | R2 | Remove fixed `w-36`, collapse at `max-sm:` |
| `features/shell/components/side-panel-actions.tsx` | R2 | Condense icons at narrow widths |
| `features/player/components/mini-player.tsx` | 2, R3 | Fix 28px buttons → 44px size-11 |
| `features/player/components/playback-controls.tsx` | R3 | Icon buttons → mobile size at `max-sm:` |
| `components/shared/card-item.tsx` | 2, R4 | Play overlay `hoverable:` variant, artwork scale |
| `components/shared/list-item.tsx` | 2, R4 | Index/play swap, like button `hoverable:` variant |
| `components/ui/button-variants.ts` | 2,3, R3 | Add `mobile` + `icon-mobile` size variants |
| `features/shell/components/titlebar.tsx` | R7 | Hide window buttons on mobile |
| `components/shared/scrolling-text.tsx` | R2 | `trigger="always"` → `trigger="hover"` |
| `components/shared/virtualized-grid.tsx` | R1d | Column count down to 1, item height adjustment |
| `hooks/use-track-context-menu.ts` | 3 | Expose data for mobile action sheet |

---

## Porting Effort Estimate

| Phase | Focus | Files | Est. Days | Dependencies |
|-------|-------|-------|-----------|-------------|
| **R (responsive)** | Shell layout, player bar, touch targets, hover patterns | 18 | 5 | None (testable by window resize) |
| 1 | Gate Rust deps + #[cfg] guards | 8 | 1–2 | None |
| 2 | Full mobile layout (bottom tabs, mini-player, now-playing) | 10 | 3–5 | R |
| 3 | Gestures + mobile-friendly interactions | 8–10 | 3–5 | Phase 2 |
| 4 | Config, build, CSS, polish | 10+ | 2–3 | Phases 1–3 |
| **Mobile audio** | Oboe + AVAudioEngine bridge | 3–5 | 10–14 | Phase 1 |
| **Total** | | **~57** | **14–21** | |

> Mobile audio (Phase 1 sub-item) is estimated separately because it's the single largest unknown — it depends on whether Tauri's community audio plugin or a custom Oboe/AVAudioEngine bridge is chosen.

---

## Build & CI

After mobile support is implemented:

```bash
# Initialize mobile targets (one-time)
pnpm tauri android init
pnpm tauri ios init

# Build for each platform
pnpm tauri build --target android
pnpm tauri build --target ios

# CI: update release-please.yml and release-build.yml
# to include Android APK/AAB and iOS IPA artifacts
```

CI changes needed:
- `release-build.yml`: Add `tauri build --target android` and `--target ios` steps
- Update bundler config for APK/AAB/IPA
- Add code signing for iOS (Apple Developer account required)
- Add keystore config for Android

---

## `TODO.md` reference

Existing acknowledgment in `TODO.md` (lines 689–692):
> "Tauri v2 supports iOS/Android. Existing `main.rs` has `#[cfg_attr(mobile, tauri::mobile_entry_point)]` placeholder."
> "Separate `mobile/` workspace with slim React UI tailored for mobile"

The "separate workspace" approach is one strategy, but the assessment above suggests a **shared codebase with conditional layouts** is more practical — the Zustand stores, Tauri commands, SQLite layer, and symphonia decoder are all portable. Only the layout shell and interaction patterns need swapping.
