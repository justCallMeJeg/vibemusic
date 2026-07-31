import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/stores/settings-store";

export function useArtistKeyboardNav(albumsLength: number, tracksLength: number) {
  const focusedAlbumIdxRef = useRef(-1);

  useEffect(() => {
    if (albumsLength === 0) return;
    if (!useSettingsStore.getState().experimentalFeatures.keyboardNav) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      if (e.key === "ArrowLeft") {
        const inAlbums = target.closest('[data-album-index]');
        if (!inAlbums) return;
        e.preventDefault();
        e.stopPropagation();
        const current = focusedAlbumIdxRef.current >= 0 ? focusedAlbumIdxRef.current : 0;
        const next = Math.max(0, current - 1);
        const btn = document.querySelector<HTMLElement>(`[data-album-index="${next}"] button`);
        btn?.focus({ preventScroll: true });
        focusedAlbumIdxRef.current = next;
        return;
      }

      if (e.key === "ArrowRight") {
        const inAlbums = target.closest('[data-album-index]');
        if (!inAlbums) return;
        e.preventDefault();
        e.stopPropagation();
        const current = focusedAlbumIdxRef.current >= 0 ? focusedAlbumIdxRef.current : 0;
        const next = Math.min(albumsLength - 1, current + 1);
        const btn = document.querySelector<HTMLElement>(`[data-album-index="${next}"] button`);
        btn?.focus({ preventScroll: true });
        focusedAlbumIdxRef.current = next;
        return;
      }

      if (e.key === "ArrowUp") {
        const firstTrack = target.closest('[data-item-index="0"]');
        if (firstTrack && albumsLength > 0) {
          e.preventDefault();
          e.stopPropagation();
          const firstAlbumBtn = document.querySelector<HTMLElement>(
            `[data-album-index="0"] button`,
          );
          firstAlbumBtn?.focus({ preventScroll: true });
          focusedAlbumIdxRef.current = 0;
          const el = document.getElementById('artist-albums-section');
          if (el) {
            const scrollable = el.closest<HTMLElement>('[class*="overflow-y-auto"]');
            scrollable?.scrollTo({ top: 0, behavior: 'smooth' });
          }
          return;
        }
      }

      if (e.key === "ArrowDown") {
        const inAlbums = target.closest('[data-album-index]');
        const inTracks = target.closest('[data-item-index]');
        if (inAlbums && !inTracks && tracksLength > 0) {
          e.preventDefault();
          e.stopPropagation();
          const firstTrack = document.querySelector<HTMLElement>('[data-item-index="0"]');
          firstTrack?.focus();
        }
      }
    };

    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [albumsLength, tracksLength]);
}
