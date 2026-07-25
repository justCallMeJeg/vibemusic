import {
  memo,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";

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
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { RovingTabindexProvider } from "@/hooks/use-roving-tabindex";
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
import { useIsPlayerVisible } from "@/stores/audio-store";
import { PageHeader } from "@/components/shared/page-header";
import { PageLayout } from "@/components/shared/page-layout";

import { useSelectionEscapeKeybind } from "@/hooks/use-selection-escape-keybind";
import { useKeybindsStore } from "@/stores/keybinds-store";
import { useInteractionStore } from "@/stores/interaction-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useSongSearchAndSort } from "@/hooks/use-song-search-and-sort";

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

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentlyPlaying = isCurrent && status === "playing";

  const handleClick = useCallback(() => {
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

  const play = useAudioStore((s) => s.play);
  const playNext = useAudioStore((s) => s.playNext);
  const setPage = useNavigationStore((s) => s.setPage);

  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useScrollMask(24, parentRef);

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const tracksRef = useRef(filteredItems);
  tracksRef.current = filteredItems;

  const isPlayerVisible = useIsPlayerVisible();
  const bottomPadding = isPlayerVisible ? 156 : 24;

  const SCOPE = "page:songs";
  useSelectionEscapeKeybind(() => {}, SCOPE, () => { if (searchQuery) setSearchQuery(""); });
  useEffect(() => {
    const { register, clearScope } = useKeybindsStore.getState();
    register(
      "ctrl+f",
      {
        combo: { key: "f", ctrl: true },
        handler: () => {
          searchInputRef.current?.focus();
        },
        description: "Focus search",
        preventDefault: true,
      },
      SCOPE,
    );
    register(
      "ctrl+a",
      {
        combo: { key: "a", ctrl: true },
        handler: () => useSelectionStore.getState().selectAll(),
        description: "Select all visible tracks",
        preventDefault: true,
      },
      SCOPE,
    );
    return () => clearScope(SCOPE);
  }, [searchQuery]);

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

      <div
        ref={parentRef}
        className={cn(
          "flex-1 overflow-y-auto px-2 scroll-mask-y",
          !isLoading && filteredItems.length === 0 && "flex flex-col gap-1",
          !isLoading &&
            filteredItems.length === 0 &&
            isPlayerVisible &&
            "pb-player-bar",
        )}
      >
        {isLoading ? null : filteredItems.length === 0 ? (
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
          )
        ) : (
          <RovingTabindexProvider
            containerRef={parentRef}
            itemCount={filteredItems.length}
            enabled={filteredItems.length > 0}
            autoFocus={filteredItems.length > 0 && useInteractionStore.getState().focusSource === "keyboard"}
            direction="vertical"
            onActivate={(index: number) => {
              const track = filteredItems[index];
              if (track) play(track);
            }}
            onActivateSecondary={(index: number) => {
              const track = filteredItems[index];
              if (track) playNext(track);
            }}
            onIndexChange={(index: number) => {
              if (index >= 0) {
                virtualizer.scrollToIndex(index, { align: "center" });
              }
            }}
          >
            <div
              className="relative w-full"
              style={{
                height: `${virtualizer.getTotalSize() + bottomPadding}px`,
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const track = filteredItems[virtualItem.index];
                return (
                  <div
                    key={track.id}
                    className="absolute top-0 left-0 w-full"
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <SongListMenu
                      track={track}
                      dataItemIndex={virtualItem.index}
                    />
                  </div>
                );
              })}
            </div>
          </RovingTabindexProvider>
        )}
      </div>
    </PageLayout>
  );
});
