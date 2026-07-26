import { useState, memo, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigationStore } from "@/stores/navigation-store";
import {
  useAudioStore,
  useCurrentTrack,
  usePlayerStatus,
  useIsPlayerVisible,
} from "@/stores/audio-store";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { getAlbumTracks, getPlaylistTracks, Album, Playlist, Track } from "@/lib/api";
import { CardItem } from "@/components/shared/card-item";
import { ListItem } from "@/components/shared/list-item";
import { ArtistLinks } from "@/components/shared/artist-links";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaylistEditDialog } from "@features/playlists/components/playlist-edit-dialog";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useSectionKeyboardNav } from "@/hooks/use-section-keyboard-nav";
import { useInteractionStore } from "@/stores/interaction-store";

import { EmptyState } from "@/components/shared/empty-state";
import { useContentStore } from "@features/library/store/content-store";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { PageLayout } from "@/components/shared/page-layout";

import { formatDuration } from "@/lib/format";

import { useShallow } from "zustand/shallow";

import { HomeSection } from "@/features/library/components/home-section";

// --- Hooks ---

function useSectionHandlers(type: "album" | "playlist") {
  const play = useAudioStore((s) => s.play);
  const playNext = useAudioStore((s) => s.playNext);
  const addToQueue = useAudioStore((s) => s.addToQueue);

  const typeRef = useRef(type);
  typeRef.current = type;

  const handlePlay = useCallback(async (id: number, shuffle = false) => {
    const t = typeRef.current;
    const getTracks = t === "album" ? getAlbumTracks : getPlaylistTracks;
    const label = t === "album" ? "Album" : "Playlist";
    try {
      const tracks = await getTracks(id);
      if (tracks.length === 0) {
        toast.error(`${label} is empty`);
        return;
      }
      const queue = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
      play(queue[0], queue);
    } catch (e) {
      logger.error(`Failed to play ${label.toLowerCase()}`, e);
    }
  }, [play]);

  const handlePlayNext = useCallback(async (id: number) => {
    const t = typeRef.current;
    const getTracks = t === "album" ? getAlbumTracks : getPlaylistTracks;
    const lower = t === "album" ? "album" : "playlist";
    try {
      const tracks = await getTracks(id);
      if (tracks.length === 0) return;
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success(`Playing ${lower} next`);
    } catch (e) {
      logger.error(`Failed to play ${lower} next`, e);
    }
  }, [playNext]);

  const handleAddToQueue = useCallback(async (id: number) => {
    const t = typeRef.current;
    const getTracks = t === "album" ? getAlbumTracks : getPlaylistTracks;
    const lower = t === "album" ? "album" : "playlist";
    try {
      const tracks = await getTracks(id);
      if (tracks.length === 0) return;
      tracks.forEach((track) => addToQueue(track));
      toast.success(`Added ${lower} to queue`);
    } catch (e) {
      logger.error(`Failed to add ${lower} to queue`, e);
    }
  }, [addToQueue]);

  return { handlePlay, handlePlayNext, handleAddToQueue };
}

function usePlaylistDeleteDialog() {
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = useCallback(async () => {
    if (!playlistToDelete) return;
    setIsDeleting(true);
    try {
      await deletePlaylist(playlistToDelete.id);
    } catch (error) {
      logger.error("Failed to delete playlist", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setPlaylistToDelete(null);
    }
  }, [deletePlaylist, playlistToDelete]);

  const handleDeleteRequest = useCallback((playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setIsDeleteDialogOpen(true);
  }, []);

  return {
    playlistToDelete,
    isDeleteDialogOpen,
    isDeleting,
    confirmDelete,
    handleDeleteRequest,
    setIsDeleteDialogOpen,
  };
}

function useHomeSectionNav(albumsLen: number, playlistsLen: number, tracksLen: number) {
  return useMemo(() => {
    let idx = 0;
    const albumSectionIdx = albumsLen > 0 ? idx++ : -1;
    const playlistSectionIdx = playlistsLen > 0 ? idx++ : -1;
    const trackSectionIdx = tracksLen > 0 ? idx++ : -1;
    return { albumSectionIdx, playlistSectionIdx, trackSectionIdx } as const;
  }, [albumsLen, playlistsLen, tracksLen]);
}

// --- Sub-components ---

const HomeTrackRow = memo(function HomeTrackRow({
  track,
  currentTrackId,
  status,
  playlists,
  play,
  pause,
  resume,
  playNext,
  addToQueue,
  addToPlaylist,
  tabIndex,
  'data-section-item': dataSectionItem,
}: {
  track: Track;
  currentTrackId?: number;
  status: string;
  playlists: Playlist[];
  play: (track: Track, queue?: Track[]) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  playNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  addToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  tabIndex?: number;
  'data-section-item'?: string;
}) {
  const isActive = currentTrackId === track.id;
  const isCurrentlyPlaying = isActive && status === "playing";

  const handleClick = useCallback(() => {
    if (isActive) {
      if (status === "playing") pause();
      else resume();
    } else {
      play(track);
    }
  }, [isActive, status, pause, resume, play, track]);

  const menuActions = useMemo(
    () => ({
      onPlay: () => {
        if (isActive) {
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
    [isActive, status, pause, resume, play, track, playNext, addToQueue, addToPlaylist, playlists],
  );

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
    [track.artist_names, track.artist_ids, track.artist_roles, track.artist, track.artist_id],
  );

  return (
    <ListItem
      title={track.title}
      subtitle={subtitle}
      artworkSrc={track.artwork_path || undefined}
      showArtwork
      active={isActive}
      isPlaying={isCurrentlyPlaying}
      onClick={handleClick}
      trailing={trailing}
      menuActions={menuActions}
      tabIndex={tabIndex}
      data-section-item={dataSectionItem}
      itemId={track.id}
    />
  );
});

const AlbumCardItem = memo(function AlbumCardItem({
  album,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onOpenDetail,
  tabIndex,
  'data-section-item': dataSectionItem,
}: {
  album: Album;
  onPlay: (id: number, shuffle?: boolean) => Promise<void>;
  onPlayNext: (id: number) => Promise<void>;
  onAddToQueue: (id: number) => Promise<void>;
  onOpenDetail: (id: number) => void;
  tabIndex?: number;
  'data-section-item'?: string;
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
      artworkSrc={album.artwork_path || undefined}
      artworkType="album"
      variant="compact"
      onClick={() => onOpenDetail(album.id)}
      onPlay={() => onPlay(album.id)}
      menuActions={menuActions}
      tabIndex={tabIndex}
      data-section-item={dataSectionItem}
    />
  );
});

const PlaylistCardItem = memo(function PlaylistCardItem({
  playlist,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onOpenDetail,
  onEdit,
  onDelete,
  tabIndex,
  'data-section-item': dataSectionItem,
}: {
  playlist: Playlist;
  onPlay: (id: number, shuffle?: boolean) => Promise<void>;
  onPlayNext: (id: number) => Promise<void>;
  onAddToQueue: (id: number) => Promise<void>;
  onOpenDetail: (id: number) => void;
  onEdit: (p: Playlist) => void;
  onDelete: (p: Playlist) => void;
  tabIndex?: number;
  'data-section-item'?: string;
}) {
  const menuActions = useMemo(
    () => ({
      onPlay: () => onPlay(playlist.id),
      onShuffle: () => onPlay(playlist.id, true),
      onPlayNext: () => onPlayNext(playlist.id),
      onAddToQueue: () => onAddToQueue(playlist.id),
      onEdit: () => onEdit(playlist),
      onDelete: () => onDelete(playlist),
    }),
    [playlist, onPlay, onPlayNext, onAddToQueue, onEdit, onDelete],
  );

  return (
    <CardItem
      title={playlist.name}
      subtitle={`${playlist.track_count} tracks`}
      artworkSrc={playlist.artwork_path || undefined}
      artworkType="playlist"
      variant="compact"
      onClick={() => onOpenDetail(playlist.id)}
      onPlay={() => onPlay(playlist.id)}
      menuActions={menuActions}
      tabIndex={tabIndex}
      data-section-item={dataSectionItem}
    />
  );
});

// --- Main component ---

export default memo(function HomePage() {
  const { albums, tracks, isLoading } = useContentStore(
    useShallow((s) => ({
      albums: s.albums,
      tracks: s.tracks,
      isLoading: s.isLoading,
    })),
  );
  const playlists = usePlaylistStore((s) => s.playlists);
  const setPage = useNavigationStore((s) => s.setPage);
  const currentTrack = useCurrentTrack();
  const status = usePlayerStatus();
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const resume = useAudioStore((s) => s.resume);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const openPlaylistDetail = useNavigationStore((s) => s.openPlaylistDetail);
  const addToPlaylist = usePlaylistStore((s) => s.addToPlaylist);

  const { handlePlay: handlePlayAlbum, handlePlayNext: handlePlayNextAlbum, handleAddToQueue: handleAddAlbumToQueue } = useSectionHandlers("album");
  const { handlePlay: handlePlayPlaylist, handlePlayNext: handlePlayNextPlaylist, handleAddToQueue: handleAddPlaylistToQueue } = useSectionHandlers("playlist");
  const deleteDialog = usePlaylistDeleteDialog();
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollMask(24, scrollRef);
  const isPlayerVisible = useIsPlayerVisible();

  const recentTracks = useMemo(() => tracks.slice(0, 20), [tracks]);
  const displayAlbums = useMemo(() => albums.slice(0, 10), [albums]);
  const displayPlaylists = useMemo(() => playlists.slice(0, 10), [playlists]);
  const { albumSectionIdx, playlistSectionIdx, trackSectionIdx } = useHomeSectionNav(
    displayAlbums.length, displayPlaylists.length, recentTracks.length,
  );

  const isEmpty = !isLoading && displayAlbums.length === 0 && displayPlaylists.length === 0 && recentTracks.length === 0;

  const sectionNav = useSectionKeyboardNav({
    containerRef: scrollRef,
    enabled: !isEmpty,
    sections: [
      ...(displayAlbums.length > 0
        ? [{
            id: "albums",
            itemCount: displayAlbums.length,
            orientation: "horizontal" as const,
            onActivate: (idx: number) => openAlbumDetail(displayAlbums[idx].id),
            onActivateSecondary: (idx: number) => handlePlayAlbum(displayAlbums[idx].id),
          }]
        : []),
      ...(displayPlaylists.length > 0
        ? [{
            id: "playlists",
            itemCount: displayPlaylists.length,
            orientation: "horizontal" as const,
            onActivate: (idx: number) => openPlaylistDetail(displayPlaylists[idx].id),
            onActivateSecondary: (idx: number) => handlePlayPlaylist(displayPlaylists[idx].id),
          }]
        : []),
      ...(recentTracks.length > 0
        ? [{
            id: "tracks",
            itemCount: recentTracks.length,
            orientation: "vertical" as const,
            onActivate: (idx: number) => {
              const track = recentTracks[idx];
              if (track) play(track);
            },
            onActivateSecondary: (idx: number) => {
              const track = recentTracks[idx];
              if (track) playNext(track);
            },
          }]
        : []),
    ],
    onFocusChange: (_sectionIdx: number, _itemIdx: number) => {
      const el = document.querySelector<HTMLElement>(
        `[data-section-item="${_sectionIdx}:${_itemIdx}"]`,
      );
      el?.scrollIntoView({ block: "center", behavior: "auto" });
    },
  });

  useEffect(() => {
    if (isEmpty) return;
    if (useInteractionStore.getState().focusSource !== "keyboard") return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[data-section-item="0:0"]');
      el?.focus({ preventScroll: true });
    });
  }, [isEmpty]);

  if (isLoading && albums.length === 0 && playlists.length === 0 && tracks.length === 0) {
    return null;
  }

  return (
    <PageLayout overflowHidden>
      <div className="mt-8 mb-6 px-2">
        <h1 className="text-4xl font-bold text-primary">Welcome Back</h1>
        <p className="text-muted-foreground mt-1">
          Here's some music for you today.
        </p>
      </div>
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-overlay overflow-x-hidden px-2 space-y-8 scroll-mask-y",
          (displayAlbums.length > 0 || displayPlaylists.length > 0) &&
            (isPlayerVisible ? "pb-player-bar" : "pb-8"),
          isEmpty && "flex flex-col",
          isEmpty && isPlayerVisible && "pb-player-bar",
        )}
      >
        <HomeSection
          title="Albums"
          items={displayAlbums}
          orientation="horizontal"
          onSeeAll={() => setPage("albums")}
          renderItem={(album, idx) => (
            <AlbumCardItem
              key={album.id}
              album={album}
              onPlay={handlePlayAlbum}
              onPlayNext={handlePlayNextAlbum}
              onAddToQueue={handleAddAlbumToQueue}
              onOpenDetail={openAlbumDetail}
              tabIndex={sectionNav.getTabIndex(albumSectionIdx, idx)}
              data-section-item={`${albumSectionIdx}:${idx}`}
            />
          )}
        />
        <HomeSection
          title="Playlists"
          items={displayPlaylists}
          orientation="horizontal"
          onSeeAll={() => setPage("playlists")}
          renderItem={(p, idx) => (
            <PlaylistCardItem
              key={p.id}
              playlist={p}
              onPlay={handlePlayPlaylist}
              onPlayNext={handlePlayNextPlaylist}
              onAddToQueue={handleAddPlaylistToQueue}
              onOpenDetail={openPlaylistDetail}
              onEdit={setEditingPlaylist}
              onDelete={deleteDialog.handleDeleteRequest}
              tabIndex={sectionNav.getTabIndex(playlistSectionIdx, idx)}
              data-section-item={`${playlistSectionIdx}:${idx}`}
            />
          )}
        />
        <HomeSection
          title="Recently Added"
          items={recentTracks}
          orientation="vertical"
          onSeeAll={() => setPage("songs")}
          renderItem={(track, idx) => (
            <HomeTrackRow
              key={track.id}
              track={track}
              currentTrackId={currentTrack?.id}
              status={status}
              playlists={playlists}
              play={play}
              pause={pause}
              resume={resume}
              playNext={playNext}
              addToQueue={addToQueue}
              addToPlaylist={addToPlaylist}
              tabIndex={sectionNav.getTabIndex(trackSectionIdx, idx)}
              data-section-item={`${trackSectionIdx}:${idx}`}
            />
          )}
        />

        {!isLoading && displayAlbums.length === 0 && displayPlaylists.length === 0 && recentTracks.length === 0 && (
          <EmptyState
            icon={Play}
            title="Your library is empty"
            description="Import your local music to get started."
            action={<Button onClick={() => setPage("settings")}>Add Music Folder</Button>}
          />
        )}
      </div>

      {editingPlaylist && (
        <PlaylistEditDialog
          playlist={editingPlaylist}
          open={!!editingPlaylist}
          onOpenChange={(open) => !open && setEditingPlaylist(null)}
        />
      )}

      <ConfirmDialog
        open={deleteDialog.isDeleteDialogOpen}
        onOpenChange={deleteDialog.setIsDeleteDialogOpen}
        title="Delete Playlist?"
        description={`This action cannot be undone. This will permanently delete the playlist "${deleteDialog.playlistToDelete?.name}".`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={deleteDialog.confirmDelete}
        isLoading={deleteDialog.isDeleting}
        loadingText="Deleting..."
      />
    </PageLayout>
  );
});
