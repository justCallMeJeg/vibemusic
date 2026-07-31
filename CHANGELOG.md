# Changelog

All notable changes to Vibe Music will be documented in this file.

## [1.1.0](https://github.com/gjpgabayeron/vibemusic/compare/v1.0.0...v1.1.0) (2026-07-31)


### Features

* enhance ui and performance with new features and refactoring ([#7](https://github.com/gjpgabayeron/vibemusic/issues/7)) ([9ffdd10](https://github.com/gjpgabayeron/vibemusic/commit/9ffdd10a9eb429840f160a567ccfbf4f95d632a7))

## [1.1.12] - 2026-07-30

Highlights: keyboard navigation overhaul, multi-select and batch operations, Discord Rich Presence and Last.fm scrobbling, playlist pinning and liked music system, sleep timer, customizable keybindings, crossfade and fade-in/out, app updater improvements, lyrics panel overhaul, and major performance work across both frontend and backend.

### ✨ Features

**Playback**

- Add track fade in and out on play and pause events
- Add sleep timer (duration / end-of-track / end-of-album modes)
- Improve crossfade logic and ring buffer draining
- Improve track playback on artist detail and insights pages

**Player & Queue**

- Detail panel closes automatically when queue or playback ends
- Side panel content modularization with track metadata panel

**Navigation & Keyboard Controls**

- Full keyboard navigation system with focus regions, roving tabindex, and auto-focus on list and grid items
- Page-specific keyboard shortcuts with on-screen overlay
- Visual keybind editor with persistent per-profile overrides
- Location-based breadcrumb navigation with history
- Improved focus indicator behavior across all pages

**Library & Playlists**

- Multi-select with batch operations (add to queue, play next, add to playlist, remove from playlist)
- Playlist pinning and liked music system
- Keyboard-driven playlist reorder
- Expanded context menu with new actions
- Dynamic placeholder for album/artist images without artwork
- Improved artist and album parsing logic

**Search**

- Deferred search query for smoother typing experience

**Integrations**

- Discord Rich Presence (now-playing status, optional feature)
- Last.fm scrobbling with OAuth flow and now-playing updates (optional feature)

**Settings & UX**

- Settings page modularization and UI/UX overhaul
- App updater UI/UX improvements (check, download, install, manual download fallback, channel switching)
- Empty state UI/UX across all pages
- Progressive loading and skeleton UI for insights, home, and detail pages
- Experimental features support

**Landing Page**

- Accessibility improvements and manual controls for screenshot carousel

### 🐛 Bug Fixes

**Playback & Audio**

- Fix stopped track playback not resuming properly
- Fix seeking resuming a paused track
- Fix track crossfade edge cases
- Fix ring buffer drain and switch to coarse seek mode for lower seek latency
- Cache decoder sample rate to prevent repeated initialization

**UI & State**

- Switching profiles now properly resets UI states
- Fix stale active styling on cards and list items when changing focus
- Fix double close button on search
- Fix liked music card style on home page
- Fix unlayered CSS overriding transition animations
- Handle risky conditional rendering paths

**Library & Playlists**

- Fix playlists not fetched on first load
- Handle unique constraint error on duplicate playlist creation
- Fix consistent virtualized list behavior on songs page
- Fix lyric cache not updating when LRC file is downloaded

**Infrastructure**

- Fix CI release body generation (PowerShell newline escaping, code fence formatting)
- Fix CNAME change issue in landing page deployment
- Fix version parser for landing page
- Add Cargo.lock to version bump script

### ⚡ Performance

**Frontend**

- Add shallow subscriptions for homepage store selectors to prevent unnecessary re-renders
- Deferred search query value
- Memoization across multiple pages (track lists, grids, detail views)
- Lazy-load side panel components and deep dependencies
- Lazy loading with temporary skeleton placeholders
- Refactor inline callbacks to stable references
- Add request deduplication layer to API calls
- Refactor array lookups to use map indexes
- Add one-time event listeners
- Reduce React re-renders with memo and component-scope hoisting

**Backend**

- Add in-memory probe cache to reduce redundant file probing
- Pre-decode audio in worker before creating CPAL stream
- SQL query optimization

### ♻️ Refactoring

**Frontend**

- Replace ad-hoc skeleton implementations with skeleton primitives
- Remove prop drilling for dialogs
- Consolidate format utilities into centralized module
- Flatten IIFEs for readability
- CSS-driven opacity instead of JS
- Remove lazy imports in favor of eager loading with skeletons
- Modularize avatar colors

**Backend**

- Refactor backend architecture for better modularity and maintainability
- Refactor frontend architecture for better modularity and maintainability
- Unify app error types and split god files into focused modules
- Reduce code complexity across the codebase

### 🎨 Styling

- Fix hardcoded color values throughout
- Add relevant semantic color tokens
- Remove dead custom scrollbar class
- Add motion-safe and content-visibility to skeleton components
- Replace raw text placeholders with proper loader components
- Improve scrollbar behavior across the app
- Center insight page empty state
- Update destructive and spacing tokens for consistency
- Reduce side panel content padding
- Fix unlayered CSS overriding every transition animation

### 🧪 Testing

- Expand test coverage across various pages and stores

### 🔧 Miscellaneous

- Design audit and critique post-v1.0
- Remove debug classes from production builds
- Remove dead code, pruned unused exports and dependencies
- Add environment configuration for social integrations
- Update artifact name format for CI builds

## [1.0.0] - 2026-06-30

### ✨ Features

- On-save and pre-commit linting
- Shadcn setup

### 🐛 Bug Fixes

- Project version to 0.0.1
- Nightly build trigger branch to 'dev'

### 🔧 Miscellaneous

- Add recommended extensions for DX
- Init readme
- V1.0.0 release — merge dev to master (#4)
- Fix release-please config and landing deploy [skip ci]
- Force fresh landing deploy [skip ci]
- **master**: Release 1.0.0 (#5)
- Fix release-please manifest to match master version
- Force fresh landing deploy [skip ci]
- Trigger landing deploy
- Add google search console verification meta tag
- Add kofi for donations [skip ci]
- Tauri version bump to match actual stable version [skip ci]
