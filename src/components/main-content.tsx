import { Suspense, lazy } from "react";
import { useCurrentPage, useDetailView } from "@/stores/navigation-store";
import { PageSkeleton } from "./page-skeleton";

// Lazy load pages
const SongsPage = lazy(() => import("@/pages/songs-page"));
const AlbumsPage = lazy(() => import("@/pages/albums-page"));
const AlbumDetailPage = lazy(() => import("@/pages/album-detail-page"));
const PlaylistsPage = lazy(() => import("@/pages/playlists-page"));
const PlaylistDetailPage = lazy(() => import("@/pages/playlist-detail-page"));
const ArtistsPage = lazy(() => import("@/pages/artists-page"));
const ArtistDetailPage = lazy(() => import("@/pages/artist-detail-page"));
const HomePage = lazy(() => import("@/pages/home-page"));
const SettingsPage = lazy(() => import("@/pages/settings-page"));

export default function MainContent() {
  const currentPage = useCurrentPage();
  const detailView = useDetailView();

  return (
    <Suspense fallback={<PageSkeleton />}>
      {/* Handle detail views first */}
      {detailView ? (
        <>
          {detailView.type === "album" && <AlbumDetailPage />}
          {detailView.type === "playlist" && <PlaylistDetailPage />}
          {detailView.type === "artist" && <ArtistDetailPage />}
        </>
      ) : (
        /* Handle main pages */
        <>
          {currentPage === "home" && <HomePage />}
          {currentPage === "songs" && <SongsPage />}
          {currentPage === "albums" && <AlbumsPage />}
          {currentPage === "playlists" && <PlaylistsPage />}
          {currentPage === "artists" && <ArtistsPage />}
          {(currentPage === "settings" || currentPage === "about") && (
            <SettingsPage />
          )}
        </>
      )}
    </Suspense>
  );
}
