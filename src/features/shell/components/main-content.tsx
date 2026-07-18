import { useCurrentPage, useDetailView } from "@/stores/navigation-store";

import HomePage from "@features/library/pages/home-page";
import SongsPage from "@features/library/pages/songs-page";
import AlbumsPage from "@features/library/pages/albums-page";
import AlbumDetailPage from "@features/library/pages/album-detail-page";
import PlaylistsPage from "@features/playlists/pages/playlists-page";
import PlaylistDetailPage from "@features/playlists/pages/playlist-detail-page";
import ArtistsPage from "@features/library/pages/artists-page";
import ArtistDetailPage from "@features/library/pages/artist-detail-page";
import InsightsPage from "@features/insights/pages/insights-page";
import SettingsPage from "@features/settings/pages/settings-page";

export default function MainContent() {
  const currentPage = useCurrentPage();
  const detailView = useDetailView();

  return (
    <>
      {detailView ? (
        <>
          {detailView.type === "album" && <AlbumDetailPage />}
          {detailView.type === "playlist" && <PlaylistDetailPage />}
          {detailView.type === "artist" && <ArtistDetailPage />}
        </>
      ) : (
        <>
          {currentPage === "home" && <HomePage />}
          {currentPage === "songs" && <SongsPage />}
          {currentPage === "albums" && <AlbumsPage />}
          {currentPage === "playlists" && <PlaylistsPage />}
          {currentPage === "artists" && <ArtistsPage />}
          {currentPage === "insights" && <InsightsPage />}
          {(currentPage === "settings" || currentPage === "about") && (
            <SettingsPage />
          )}
        </>
      )}
    </>
  );
}
