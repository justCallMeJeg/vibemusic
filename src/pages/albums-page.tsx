import { useMemo, useState, memo, useCallback, useDeferredValue } from "react";
import { cn } from "@/lib/utils";
import { Disc, Search } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useLibraryStore } from "@/stores/library-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { getAlbumTracks, Album } from "@/lib/api";
import { useAudioStore } from "@/stores/audio-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { CardItem } from "@/components/shared/card-item";
import { VirtualizedGrid } from "@/components/shared/virtualized-grid";
import { PageHeader } from "@/components/shared/page-header";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import { PageLayout } from "@/components/shared/page-layout";



const AlbumGridCard = memo(function AlbumGridCard({
  album,
  onOpenDetail,
  onPlay,
  onPlayNext,
  onAddToQueue,
}: {
  album: Album;
  onOpenDetail: (id: number) => void;
  onPlay: (id: number, shuffle?: boolean) => Promise<void>;
  onPlayNext: (id: number) => Promise<void>;
  onAddToQueue: (id: number) => Promise<void>;
}) {
  const menuActions = useMemo(
    () => ({
      onPlay: () => onPlay(album.id),
      onShuffle: () => onPlay(album.id, true),
      onPlayNext: () => onPlayNext(album.id),
      onAddToQueue: () => onAddToQueue(album.id),
    }),
    [album.id, onPlay, onPlayNext, onAddToQueue],
  );

  return (
    <CardItem
      title={album.title}
      subtitle={album.artist_name || "Unknown Artist"}
      tertiaryText={`${album.track_count} tracks`}
      artworkSrc={album.artwork_path || undefined}
      artworkType="album"
      variant="portrait"
      onClick={() => onOpenDetail(album.id)}
      onPlay={() => onPlay(album.id)}
      menuActions={menuActions}
    />
  );
});

export default function AlbumsPage() {
  const albums = useLibraryStore((s) => s.albums);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const albumsSortKey = useSettingsStore((s) => s.albumsSortKey);
  const albumsSortDirection = useSettingsStore((s) => s.albumsSortDirection);
  const setAlbumsSort = useSettingsStore((s) => s.setAlbumsSort);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const handlePlayAlbum = useCallback(async (albumId: number, shuffle = false) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) { toast.error("Album is empty"); return; }
      const queue = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
      play(queue[0], queue);
    } catch (e) { logger.error("Failed to play album", e); }
  }, [play]);

  const handlePlayNext = useCallback(async (albumId: number) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) return;
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing album next");
    } catch (e) { logger.error("Failed to play album next", e); }
  }, [playNext]);

  const handleAddToQueue = useCallback(async (albumId: number) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) return;
      tracks.forEach((track) => addToQueue(track));
      toast.success("Added album to queue");
    } catch (e) { logger.error("Failed to add album to queue", e); }
  }, [addToQueue]);

  const filteredAndSortedAlbums = useMemo(() => {
    let result = [...albums];

    if (deferredQuery) {
      const query = deferredQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          (a.artist_name && a.artist_name.toLowerCase().includes(query))
      );
    }

    return result.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      switch (albumsSortKey) {
        case "title":
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case "artist":
          valA = (a.artist_name || "").toLowerCase();
          valB = (b.artist_name || "").toLowerCase();
          break;
        case "year":
          valA = a.year || 0;
          valB = b.year || 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return albumsSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return albumsSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [albums, albumsSortKey, albumsSortDirection, deferredQuery]);

  return (
    <PageLayout overflowHidden>
      <PageHeader title="Albums">
        <div className={cn("relative w-64 mr-2", isLoading && "pointer-events-none opacity-50")}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter albums..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            disabled={isLoading}
          />
        </div>
        <div className={isLoading ? "pointer-events-none opacity-50" : ""}>
          <SortDropdown
            sortKey={albumsSortKey}
            sortDirection={albumsSortDirection}
            onSortChange={(k, d) => setAlbumsSort(k, d)}
            options={[
              { label: "Title", value: "title" },
              { label: "Artist", value: "artist" },
              { label: "Year", value: "year" },
            ]}
          />
        </div>
      </PageHeader>

      {isLoading ? null : (
        <VirtualizedGrid
          items={filteredAndSortedAlbums}
          renderItem={(album) => (
            <AlbumGridCard
              key={album.id}
              album={album}
              onOpenDetail={openAlbumDetail}
              onPlay={handlePlayAlbum}
              onPlayNext={handlePlayNext}
              onAddToQueue={handleAddToQueue}
            />
          )}
          itemHeight={220}
          emptyState={
            searchQuery ? (
              <EmptyState
                icon={Search}
                title="No matches found"
                description={`We couldn't find any albums matching "${searchQuery}"`}
              />
            ) : (
              <EmptyState
                icon={Disc}
                title="No albums found"
                description="Import music to see your albums here."
              />
            )
          }
        />
      )}
    </PageLayout>
  );
}
