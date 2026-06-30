# VibeMusic

## Register

product

## Users

Audiophiles and privacy-conscious listeners who manage their own music libraries. They value high-quality local playback (FLAC, MP3, OGG, WAV, AIFF) and refuse to trade their listening data for convenience. They're likely tech-literate, on Windows/macOS/Linux, and prefer open-source software that respects their autonomy.

## Product Purpose

A beautiful, cross-platform desktop music player that plays the user's own files — no cloud, no streaming, no tracking. Every profile gets its own library, playlists, and listening stats. Success means the user forgets the UI exists and is just listening to music, but the UI is a pleasure to look at when they do glance at it.

## Brand Personality

Precise, confident, intentional. Every pixel purposeful, every interaction considered — like a well-made instrument. The UI is confident enough to get out of the way. The music is the star.

Three words: **Precise · Intentional · Unobtrusive**

## Anti-references

- **Not WinAmp** — no skeuomorphism, no overflowing visual complexity, no retro "skins" aesthetic.
- **Not iTunes** — no dense table views, no toolbar-heavy chrome, no translucent-at-scale patterns.
- **Not AI-template** — no gradient text, no glassmorphism-as-default, no numbered section eyebrows, no stock-photo hero. Should feel crafted, not generated.

## Design Principles

1. **The music is the content.** Every visual decision should make the album art and track metadata the hero. Chrome recedes unless interacted with.
2. **Precision over ornament.** Fewer elements, tighter spacing, higher information density where it matters. Not minimal for the sake of minimal — every element earns its place.
3. **Dark by default, light as choice.** Music apps live in low-light environments — bedrooms, late nights, dedicated listening spaces. Dark mode is the default physical scene. Light mode respects the user who chooses it.
4. **Consistent but not uniform.** The app shell is consistent; each content view (songs, albums, artists, playlists) should feel distinct in layout and rhythm.
5. **Feedback without fuss.** Interactions respond immediately and subtly. No spinners for local operations. Transitions when they inform, not when they delay.

## Accessibility & Inclusion

Target **WCAG 2.2 AA**. Body text contrast ≥4.5:1 against all surface backgrounds. Large text ≥3:1. Keyboard-navigable throughout (the app is an electron-like desktop shell — shortcuts and arrow-key navigation are expected). Reduced-motion support for all animations. Dynamic album-art-based gradient background must not interfere with text readability.
