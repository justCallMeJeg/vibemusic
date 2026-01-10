import { useCurrentPage, useDetailView } from "@/stores/navigation-store";
import SongsPage from "@/pages/songs-page";
import AlbumsPage from "@/pages/albums-page";
import AlbumDetailPage from "@/pages/album-detail-page";

export default function MainContent() {
  const currentPage = useCurrentPage();
  const detailView = useDetailView();

  // Handle detail views first
  if (detailView) {
    if (detailView.type === "album") {
      return <AlbumDetailPage />;
    }
    // Future: playlist detail, etc.
  }

  // Handle main pages
  switch (currentPage) {
    case "songs":
      return <SongsPage />;
    case "albums":
      return <AlbumsPage />;
    case "playlists":
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Playlists - Coming Soon</div>
        </div>
      );
    case "settings":
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Settings - Coming Soon</div>
        </div>
      );
    default:
      return <SongsPage />;
  }
}
