import { useCurrentPage, useDetailView } from "@/stores/navigation-store";
import SongsPage from "@/pages/songs-page";
import AlbumsPage from "@/pages/albums-page";
import AlbumDetailPage from "@/pages/album-detail-page";
import PlaylistsPage from "@/pages/playlists-page";
import PlaylistDetailPage from "@/pages/playlist-detail-page";
import ArtistsPage from "@/pages/artists-page";
import ArtistDetailPage from "@/pages/artist-detail-page";
import HomePage from "@/pages/home-page";
import SettingsPage from "@/pages/settings-page";

export default function MainContent() {
  const currentPage = useCurrentPage();
  const detailView = useDetailView();

  // Handle detail views first
  if (detailView) {
    if (detailView.type === "album") {
      return <AlbumDetailPage />;
    }
    if (detailView.type === "playlist") {
      return <PlaylistDetailPage />;
    }
    if (detailView.type === "artist") {
      return <ArtistDetailPage />;
    }
  }

  // Handle main pages
  switch (currentPage) {
    case "home":
      return <HomePage />;
    case "songs":
      return <SongsPage />;
    case "albums":
      return <AlbumsPage />;
    case "playlists":
      return <PlaylistsPage />;
    case "artists":
      return <ArtistsPage />;
    case "settings":
    case "about":
      return <SettingsPage />;
    default:
      return <SongsPage />;
  }
}
