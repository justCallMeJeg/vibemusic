import { useCurrentPage, useDetailView } from "@/stores/navigation-store";
import {
  AlbumsSkeleton,
  ArtistsSkeleton,
  DetailSkeleton,
  HomeSkeleton,
  SongsSkeleton,
  SettingsSkeleton,
} from "./skeletons";

export function PageSkeleton() {
  const currentPage = useCurrentPage();
  const detailView = useDetailView();

  // If we are in a detail view, show the detail skeleton
  // Note: Detail views overlay the main pages in the data model,
  // so we check this first.
  if (detailView) {
    return <DetailSkeleton />;
  }

  switch (currentPage) {
    case "home":
      return <HomeSkeleton />;
    case "songs":
      return <SongsSkeleton />;
    case "albums":
      return <AlbumsSkeleton />;
    case "artists":
      return <ArtistsSkeleton />;
    case "playlists":
      // Playlists page is often a grid of playlists
      return <AlbumsSkeleton />;
    case "settings":
    case "about":
      return <SettingsSkeleton />;
    default:
      return <SongsSkeleton />;
  }
}
