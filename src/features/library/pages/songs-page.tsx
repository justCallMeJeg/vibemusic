import {
  memo,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";
import { ListItem } from "@/components/shared/list-item";
import type { Track } from "@/lib/api";
import {
  useCurrentTrack,
  usePlayerStatus,
  useAudioStore,
} from "@/stores/audio-store";
import { ArtistLinks } from "@/components/shared/artist-links";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useNavigationStore } from "@/stores/navigation-store";
import { EmptyState } from "@/components/shared/empty-state";
import { ArrowUpDown, Search, Music2 } from "lucide-react";
import { useContentStore } from "@features/library/store/content-store";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { PageHeader } from "@/components/shared/page-header";
import { PageLayout } from "@/components/shared/page-layout";

import { useIndexPageKeybinds } from "@/hooks/use-index-page-keybinds";
import { useSelectionStore } from "@/stores/selection-store";
import { useSongSearchAndSort } from "@/hooks/use-song-search-and-sort";

import { VirtualizedList } from "@/components/shared/virtualized-list";

import { formatDuration } from "@/lib/format";

type SortKey = "title" | "artist" | "date_added" | "duration";
type SortDirection = "asc" | "desc";

const ITEM_HEIGHT = 60;

const SongListMenu = memo(function SongListMenu({
  track,
  dataItemIndex,
}: {
  track: Track;
  dataItemIndex?: number;
}) {
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const pause = useAudioStore((s) => s.pause);
  const resume = useAudioStore((s) => s.resume);
  const play = useAudioStore((s) => s.play);
  const playNext = useAudioStore((s) => s.playNext);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const addToPlaylist = usePlaylistStore((s) => s.addToPlaylist);
  const playlists = usePlaylistStore((s) => s.playlists);
  const likedTrackIds = usePlaylistStore((s) => s.likedTrackIds);
  const toggleLike = usePlaylistStore((s) => s.toggleLike);
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const openArtistDetail = useNavigationStore((s) => s.openArtistDetail);

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && status === "playing";

  const handleClick = useCallback((_e: React.MouseEvent) => {
    if (isCurrent) {
      if (status === "playing") pause();
      else resume();
    } else {
      play(track);
    }
  }, [isCurrent, status, pause, resume, play, track]);

  const trailing = useMemo(
    () => (
      <p className="text-muted-foreground text-xs font-normal tabular-nums">
        {formatDuration(track.duration_ms)}
      </p>
    ),
    [track.duration_ms],
  );

  const subtitle = useMemo(
    () => (
      <ArtistLinks
        names={track.artist_names}
        ids={track.artist_ids}
        roles={track.artist_roles}
        fallbackName={track.artist}
        fallbackId={track.artist_id}
      />
    ),
    [
      track.artist_names,
      track.artist_ids,
      track.artist_roles,
      track.artist,
      track.artist_id,
    ],
  );

  const menuActions = useMemo(
    () => ({
      onPlay: () => {
        if (isCurrent) {
          if (status === "playing") pause();
          else resume();
        } else {
          play(track);
        }
      },
      onPlayNext: () => playNext(track),
      onAddToQueue: () => addToQueue(track),
      onAddToPlaylist: (playlistId: number) =>
        addToPlaylist(playlistId, track.id),
      playlists: playlists.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      onGoToAlbum: track.album_id != null ? () => openAlbumDetail(track.album_id!) : undefined,
      onGoToArtist:
        track.artist_ids?.[0] || track.artist_id
          ? () => openArtistDetail(track.artist_ids?.[0] ?? track.artist_id!)
          : undefined,
      onGoToArtists: track.artist_ids?.length
        ? track.artist_ids.map((id, i) => ({ name: track.artist_names[i] ?? track.artist ?? "Unknown", onSelect: () => openArtistDetail(id) }))
        : undefined,
      onToggleLike: () => toggleLike(track.id),
      isLiked: likedTrackIds.has(track.id),
    }),
    [
      isCurrent,
      status,
      pause,
      resume,
      play,
      track,
      playNext,
      addToQueue,
      addToPlaylist,
      playlists,
      openAlbumDetail,
      openArtistDetail,
      likedTrackIds,
      toggleLike,
    ],
  );

  return (
    <ListItem
      title={track.title}
      subtitle={subtitle}
      artworkSrc={track.artwork_path || undefined}
      showArtwork
      active={isCurrent}
      isPlaying={isCurrentlyPlaying}
      onClick={handleClick}
      trailing={trailing}
      menuActions={menuActions}
      dataItemIndex={dataItemIndex}
      itemId={track.id}
      selectable
    />
  );
});

export default memo(function SongsPage() {
  const isLoading = useContentStore((s) => s.isLoading);
  const {
    searchQuery,
    setSearchQuery,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    filteredItems,
  } = useSongSearchAndSort();

  useEffect(() => {
    useSelectionStore.getState().setItems(
      filteredItems.map((t, i) => ({ id: t.id, index: i })),
    );
  }, [filteredItems]);

  const play = useAudioStore((s) => s.play);
  const playNext = useAudioStore((s) => s.playNext);
  const setPage = useNavigationStore((s) => s.setPage);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const SCOPE = "page:songs";
  useIndexPageKeybinds(searchQuery, setSearchQuery, searchInputRef, SCOPE);

  const handleActivate = useCallback(
    (index: number) => {
      const track = filteredItems[index];
      if (track) play(track);
    },
    [filteredItems, play],
  );

  const handleActivateSecondary = useCallback(
    (index: number) => {
      const track = filteredItems[index];
      if (track) playNext(track);
    },
    [filteredItems, playNext],
  );

  const emptyState = useMemo(
    () =>
      searchQuery ? (
        <EmptyState
          icon={Search}
          title="No matches found"
          description={`No songs match "${searchQuery}"`}
          action={
            <Button variant="ghost" onClick={() => setSearchQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={Music2}
          title="No songs found"
          description="Import music using the sidebar button to get started."
          action={
            <Button onClick={() => setPage("settings")}>
              Add Music Folder
            </Button>
          }
        />
      ),
    [searchQuery, setSearchQuery, setPage],
  );

  return (
    <PageLayout overflowHidden>
      <PageHeader title="Songs">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "relative w-64",
              isLoading && "pointer-events-none opacity-50",
            )}
          >
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Filter songs..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          <div className={isLoading ? "pointer-events-none opacity-50" : ""}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sortKey}
                  onValueChange={(v) =>
                    setSortKey(v as SortKey)
                  }
                >
                  <DropdownMenuRadioItem value="title">
                    Title
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="artist">
                    Artist
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="date_added">
                    Date Added
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="duration">
                    Duration
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Order</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sortDirection}
                  onValueChange={(v) =>
                    setSortDirection(v as SortDirection)
                  }
                >
                  <DropdownMenuRadioItem value="asc">
                    Ascending
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="desc">
                    Descending
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {!isLoading && (
            <div className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
              {filteredItems.length} tracks
            </div>
          )}
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="flex-1" />
      ) : (
        <VirtualizedList
          items={filteredItems}
          renderItem={(track: Track, index: number) => (
            <SongListMenu track={track} dataItemIndex={index} />
          )}
          itemHeight={ITEM_HEIGHT}
          className="px-2"
          keyboardNav
          onItemActivate={handleActivate}
          onItemActivateSecondary={handleActivateSecondary}
          emptyState={emptyState}
        />
      )}

    </PageLayout>
  );
});
