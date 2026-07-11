import { useCurrentPage, useDetailView } from "@/stores/navigation-store";

import HomePage from "@/pages/home-page";
import SongsPage from "@/pages/songs-page";
import AlbumsPage from "@/pages/albums-page";
import AlbumDetailPage from "@/pages/album-detail-page";
import PlaylistsPage from "@/pages/playlists-page";
import PlaylistDetailPage from "@/pages/playlist-detail-page";
import ArtistsPage from "@/pages/artists-page";
import ArtistDetailPage from "@/pages/artist-detail-page";
import InsightsPage from "@/pages/insights-page";
import SettingsPage from "@/pages/settings-page";

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
