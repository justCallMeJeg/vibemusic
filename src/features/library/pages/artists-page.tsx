import { useMemo, useState, memo, useCallback, useDeferredValue } from "react";
import { cn } from "@/lib/utils";
import { useContentStore } from "@features/library/store/content-store";
import { useAudioStore } from "@/stores/audio-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { getArtistTracks, Artist } from "@/lib/api";
import { CardItem } from "@/components/shared/card-item";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Users, Search } from "lucide-react";
import { VirtualizedGrid } from "@/components/shared/virtualized-grid";
import { PageHeader } from "@/components/shared/page-header";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import { Input } from "@/components/ui/input";
import { PageLayout } from "@/components/shared/page-layout";

const ArtistGridCard = memo(function ArtistGridCard({
  artist,
  onOpenDetail,
  onPlay,
  onPlayNext,
  onAddToQueue,
  'data-item-index': dataItemIndex,
}: {
  artist: Artist;
  onOpenDetail: (id: number) => void;
  onPlay: (id: number, shuffle?: boolean) => Promise<void>;
  onPlayNext: (id: number) => Promise<void>;
  onAddToQueue: (id: number) => Promise<void>;
  'data-item-index'?: number;
}) {
  const menuActions = useMemo(
    () => ({
      onPlay: () => onPlay(artist.id),
      onShuffle: () => onPlay(artist.id, true),
      onPlayNext: () => onPlayNext(artist.id),
      onAddToQueue: () => onAddToQueue(artist.id),
    }),
    [artist.id, onPlay, onPlayNext, onAddToQueue],
  );

  return (
    <CardItem
      title={artist.name}
      subtitle={`${artist.album_count} ${artist.album_count === 1 ? "Album" : "Albums"} • ${artist.track_count} ${artist.track_count === 1 ? "Song" : "Songs"}`}
      artworkSrc={artist.artwork_path || undefined}
      artworkType="artist"
      variant="circle"
      onClick={() => onOpenDetail(artist.id)}
      onPlay={() => onPlay(artist.id, true)}
      menuActions={menuActions}
      data-item-index={dataItemIndex}
    />
  );
});

export default memo(function ArtistsPage() {
  const artists = useContentStore((s) => s.artists);
  const isLoading = useContentStore((s) => s.isLoading);
  const artistsSortKey = useSettingsStore((s) => s.artistsSortKey);
  const artistsSortDirection = useSettingsStore((s) => s.artistsSortDirection);
  const setArtistsSort = useSettingsStore((s) => s.setArtistsSort);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const openArtistDetail = useNavigationStore((s) => s.openArtistDetail);
  const setPage = useNavigationStore((s) => s.setPage);
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const handlePlayArtist = useCallback(async (artistId: number, shuffle = false) => {
    try {
      const tracks = await getArtistTracks(artistId);
      if (tracks.length === 0) { toast.error("No tracks found for this artist"); return; }
      const queue = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
      play(queue[0], queue);
    } catch (e) { logger.error("Failed to play artist", e); }
  }, [play]);

  const handlePlayNext = useCallback(async (artistId: number) => {
    try {
      const tracks = await getArtistTracks(artistId);
      if (tracks.length === 0) return;
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing artist next");
    } catch (e) { logger.error("Failed to play artist next", e); }
  }, [playNext]);

  const handleAddToQueue = useCallback(async (artistId: number) => {
    try {
      const tracks = await getArtistTracks(artistId);
      if (tracks.length === 0) return;
      tracks.forEach((track) => addToQueue(track));
      toast.success("Added artist to queue");
    } catch (e) { logger.error("Failed to add artist to queue", e); }
  }, [addToQueue]);

  const filteredAndSortedArtists = useMemo(() => {
    let result = [...artists];

    // Filter
    if (deferredQuery) {
      const query = deferredQuery.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(query));
    }

    // Sort
    return result.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      switch (artistsSortKey) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "album_count":
          valA = a.album_count;
          valB = b.album_count;
          break;
        case "track_count":
          valA = a.track_count;
          valB = b.track_count;
          break;
        default:
          return 0;
      }

      if (valA < valB) return artistsSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return artistsSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [artists, artistsSortKey, artistsSortDirection, deferredQuery]);

  return (
    <PageLayout overflowHidden>
      <PageHeader title="Artists">
        <div className={cn("relative w-64 mr-2", isLoading && "pointer-events-none opacity-50")}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter artists..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            disabled={isLoading}
          />
        </div>
        <div className={isLoading ? "pointer-events-none opacity-50" : ""}>
          <SortDropdown
            sortKey={artistsSortKey}
            sortDirection={artistsSortDirection}
            onSortChange={(k, d) => setArtistsSort(k, d)}
            options={[
              { label: "Name", value: "name" },
              { label: "Album Count", value: "album_count" },
              { label: "Track Count", value: "track_count" },
            ]}
          />
        </div>
      </PageHeader>

      {isLoading ? null : (
        <VirtualizedGrid
          items={filteredAndSortedArtists}
          renderItem={(artist, index) => (
            <ArtistGridCard
              key={artist.id}
              artist={artist}
              onOpenDetail={openArtistDetail}
              onPlay={handlePlayArtist}
              onPlayNext={handlePlayNext}
              onAddToQueue={handleAddToQueue}
              data-item-index={index}
            />
          )}
          itemHeight={220}
          emptyState={
            searchQuery ? (
              <EmptyState
                icon={Search}
                title="No matches found"
                description={`No artists match "${searchQuery}"`}
                action={<Button variant="ghost" onClick={() => setSearchQuery("")}>Clear search</Button>}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="No artists found"
                description="Import music to see your artists here."
                action={<Button onClick={() => setPage("settings")}>Add Music Folder</Button>}
              />
            )
          }
          keyboardNav
          onItemActivate={(index) => {
            const artist = filteredAndSortedArtists[index];
            if (artist) handlePlayArtist(artist.id);
          }}
          onItemActivateSecondary={(index) => {
            const artist = filteredAndSortedArtists[index];
            if (artist) openArtistDetail(artist.id);
          }}
        />
      )}
    </PageLayout>
  );
});
