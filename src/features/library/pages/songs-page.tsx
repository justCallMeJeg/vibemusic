import {
  memo,
  useMemo,
  useRef,
  useState,
  useCallback,
  useDeferredValue,
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
import { useSettingsStore } from "@/stores/settings-store";
import { useContentStore } from "@features/library/store/content-store";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { useIsPlayerVisible } from "@/stores/audio-store";
import { PageHeader } from "@/components/shared/page-header";
import { PageLayout } from "@/components/shared/page-layout";

import { useKeybindsStore } from "@/stores/keybinds-store";
import { useInteractionStore } from "@/stores/interaction-store";
import { useSelectionStore } from "@/stores/selection-store";

import { formatDuration } from "@/lib/format";

type SortKey = "title" | "artist" | "date_added" | "duration";
type SortDirection = "asc" | "desc";

// Item height for virtualization (matches MusicListItem padding + content)
const ITEM_HEIGHT = 60;

const SongListMenu = memo(function SongListMenu({
  track,
  status,
  currentTrackId,
  pause,
  resume,
  play,
  playNext,
  addToQueue,
  addToPlaylist,
  playlists,
  dataItemIndex,
}: {
  track: Track;
  status: string;
  currentTrackId?: number;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  play: (track: Track) => Promise<void>;
  playNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  addToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  playlists: { id: number; name: string }[];
  dataItemIndex?: number;
}) {
  const isCurrent = currentTrackId === track.id;
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
  const tracks = useContentStore((s) => s.tracks);
  const isLoading = useContentStore((s) => s.isLoading);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  // Use persistent settings - individual selectors for better re-render performance
  const songsSortKey = useSettingsStore((s) => s.songsSortKey);
  const songsSortDirection = useSettingsStore((s) => s.songsSortDirection);
  const setSongsSort = useSettingsStore((s) => s.setSongsSort);

  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const resume = useAudioStore((s) => s.resume);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);
  const playlists = usePlaylistStore((s) => s.playlists);
  const addToPlaylist = usePlaylistStore((s) => s.addToPlaylist);
  const setPage = useNavigationStore((s) => s.setPage);

  // Ref for the scrollable container
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Apply visual scroll mask using the same ref
  useScrollMask(24, parentRef);

  // ... (existing code)

  // Filter and Sort Logic
  const displayedTracks = useMemo(() => {
    let result = [...tracks];

    // Filter
    if (deferredQuery) {
      const query = deferredQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.artist && t.artist.toLowerCase().includes(query)) ||
          (t.album && t.album.toLowerCase().includes(query)),
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: string | number | undefined;
      let valB: string | number | undefined;

      switch (songsSortKey) {
        case "title":
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case "artist":
          valA = (a.artist || "").toLowerCase();
          valB = (b.artist || "").toLowerCase();
          break;
        case "duration":
          valA = a.duration_ms;
          valB = b.duration_ms;
          break;
        case "date_added":
        default:
          valA = a.id;
          valB = b.id;
          break;
      }

      if (valA === undefined || valB === undefined) return 0;
      if (valA < valB) return songsSortDirection === "asc" ? -1 : 1;
      if (valA > valB) return songsSortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [tracks, deferredQuery, songsSortKey, songsSortDirection]);

  // Virtualizer for efficient list rendering
  const virtualizer = useVirtualizer({
    count: displayedTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  // Store tracks in a ref for menu callbacks
  const tracksRef = useRef(displayedTracks);
  tracksRef.current = displayedTracks;

  // Dynamic padding based on player visibility
  const isPlayerVisible = useIsPlayerVisible();
  const bottomPadding = isPlayerVisible ? 156 : 24;

  const SCOPE = "page:songs";
  useEffect(() => {
    const { register, clearScope } = useKeybindsStore.getState();
    register(
      "escape",
      {
        combo: { key: "Escape" },
        handler: () => {
          const sel = useSelectionStore.getState();
          if (sel.mode === "checkbox" || sel.selectionCount() > 0) {
            sel.clearSelection();
            sel.disableCheckboxMode();
          } else if (searchQuery) {
            setSearchQuery("");
          }
        },
        description: "Clear search or exit batch mode",
        preventDefault: true,
      },
      SCOPE,
    );
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
        {/* Toolbar */}
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
                  value={songsSortKey}
                  onValueChange={(v) =>
                    setSongsSort(v as SortKey, songsSortDirection)
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
                  value={songsSortDirection}
                  onValueChange={(v) =>
                    setSongsSort(songsSortKey, v as SortDirection)
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
              {displayedTracks.length} tracks
            </div>
          )}
        </div>
      </PageHeader>

      <div
        ref={parentRef}
        className={cn(
          "flex-1 overflow-y-auto px-2 scroll-mask-y",
          !isLoading && displayedTracks.length === 0 && "flex flex-col gap-1",
          !isLoading &&
            displayedTracks.length === 0 &&
            isPlayerVisible &&
            "pb-player-bar",
        )}
      >
        {isLoading ? null : displayedTracks.length === 0 ? (
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
            itemCount={displayedTracks.length}
            enabled={displayedTracks.length > 0}
            autoFocus={displayedTracks.length > 0 && useInteractionStore.getState().focusSource === "keyboard"}
            direction="vertical"
            onActivate={(index: number) => {
              const track = displayedTracks[index];
              if (track) play(track);
            }}
            onActivateSecondary={(index: number) => {
              const track = displayedTracks[index];
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
                const track = displayedTracks[virtualItem.index];
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
                      status={status}
                      currentTrackId={currentTrack?.id}
                      pause={pause}
                      resume={resume}
                      play={play}
                      playNext={playNext}
                      addToQueue={addToQueue}
                      addToPlaylist={addToPlaylist}
                      playlists={playlists}
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
