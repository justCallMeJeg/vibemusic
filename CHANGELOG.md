# Changelog

All notable changes to Vibe Music will be documented in this file.

## [Unreleased]

### ✨ Features

- **dx**: Add git wizard cli

- **dx**: Impeccable init

- **ui**: Add dynamic placeholder

- **nav**: Change to location-based breadcrumb

- **ui**: Improve navigation using breadcrumb and architecture for ui consistency

- **ui**: Improve progressive loading for various pages

- **ui**: Update skeleton ui for insights page


### 🐛 Bug Fixes

- **ci**: Escape powershell newlines in release body generation [skip ci]

- Use single-quoted backticks for code fences in release body

- Fix promise cleanup pattern

- **perf**: Move find func inside zustand selector to prevent rescan on every root render

- Handle risky conditional rendering

- **perf**: Improve render by using map lookups


### ⚡ Performance

- Add audio listener cleanup

- Add homepage array subscriptions with useshallow

- Improve app init on startup

- Cache crossfade duration locally in audio-store

- Add passive true value to resize listener

- Refactor inline callbacks to stable references

- Add lazy load to side panel components

- Add usedeferred for search query

- Memoization of various pages

- Add lazy load to deep dependencies

- **api**: Add request dedup layer

- Add lazy loading and temp skeleton

- Add once true listeners

- Refactor to map indexes for improved lookups

- Use memo for improved performance


### ♻️ Refactoring

- **ci**: 3 column table layout for assets

- Replace local formatduration defs with format.ts import

- **skeleton**: Replace old skeletons with skeleton primitives

- Add album for dynamic placeholder and removed unused assets

- Remove prop drilling for dialogs

- Iife flattening

- Usememo cleanup

- Change to css driven opacity

- Remove lazy importing and update various page ui skeleton


### 🎨 Styling

- **landing**: Improve accessibility and add manual controls for screenshot carousel

- **ui**: Fix hardcoded color values

- **skeleton**: Add motion safe and content visiblity

- **loader**: Replace raw text with loaders

- Add margin in x axis for visiblity


### 🔧 Miscellaneous

- Update changelog and artifact name format

- **ui**: Design critique post v1

- **ui**: Update various ui for consistency

- **ui**: Remove debug class in prod

- **style**: Remove dead custom scrollbar class

- Remove redundant error toast calls

- Version bump

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


