import { useState, memo, useMemo, useCallback } from "react";
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
import { ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaylistEditDialog } from "@features/playlists/components/playlist-edit-dialog";
import { useScrollMask } from "@/hooks/use-scroll-mask";

import { EmptyState } from "@/components/shared/empty-state";
import { useContentStore } from "@features/library/store/content-store";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { PageLayout } from "@/components/shared/page-layout";


import { formatDuration } from "@/lib/format";

import { useShallow } from "zustand/shallow";

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
    />
  );
});

const AlbumCardItem = memo(function AlbumCardItem({
  album,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onOpenDetail,
}: {
  album: Album;
  onPlay: (id: number, shuffle?: boolean) => Promise<void>;
  onPlayNext: (id: number) => Promise<void>;
  onAddToQueue: (id: number) => Promise<void>;
  onOpenDetail: (id: number) => void;
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
}: {
  playlist: Playlist;
  onPlay: (id: number, shuffle?: boolean) => Promise<void>;
  onPlayNext: (id: number) => Promise<void>;
  onAddToQueue: (id: number) => Promise<void>;
  onOpenDetail: (id: number) => void;
  onEdit: (p: Playlist) => void;
  onDelete: (p: Playlist) => void;
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
    />
  );
});

export default memo(function HomePage() {
  const { albums, tracks, isLoading } = useContentStore(
    useShallow((s) => ({
      albums: s.albums,
      tracks: s.tracks,
      isLoading: s.isLoading,
    })),
  );
  const playlists = usePlaylistStore((s) => s.playlists);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);

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

  const handlePlayAlbum = useCallback(async (albumId: number, shuffle = false) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) {
        toast.error("Album is empty");
        return;
      }
      const queue = shuffle
        ? [...tracks].sort(() => Math.random() - 0.5)
        : tracks;
      play(queue[0], queue);
    } catch (e) {
      logger.error("Failed to play album", e);
    }
  }, [play]);

  const handlePlayNextAlbum = useCallback(async (albumId: number) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) return;
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing album next");
    } catch (e) {
      logger.error("Failed to play album next", e);
    }
  }, [playNext]);

  const handleAddAlbumToQueue = useCallback(async (albumId: number) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) return;
      tracks.forEach((track) => addToQueue(track));
      toast.success("Added album to queue");
    } catch (e) {
      logger.error("Failed to add album to queue", e);
    }
  }, [addToQueue]);

  const handlePlayPlaylist = useCallback(async (playlistId: number, shuffle = false) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) {
        toast.error("Playlist is empty");
        return;
      }
      const queue = shuffle
        ? [...tracks].sort(() => Math.random() - 0.5)
        : tracks;
      play(queue[0], queue);
    } catch (e) {
      logger.error("Failed to play playlist", e);
    }
  }, [play]);

  const handlePlayNextPlaylist = useCallback(async (playlistId: number) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) return;
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing playlist next");
    } catch (e) {
      logger.error("Failed to play playlist next", e);
    }
  }, [playNext]);

  const handleAddPlaylistToQueue = useCallback(async (playlistId: number) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) return;
      tracks.forEach((track) => addToQueue(track));
      toast.success("Added playlist to queue");
    } catch (e) {
      logger.error("Failed to add playlist to queue", e);
    }
  }, [addToQueue]);

  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
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
  };

  const handleDeleteRequest = (playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setIsDeleteDialogOpen(true);
  };

  const scrollRef = useScrollMask();

  // Dynamic padding based on player visibility
  const isPlayerVisible = useIsPlayerVisible();

  // Derived state for display - memoized to prevent new array creation on each render
  const recentTracks = useMemo(() => tracks.slice(0, 20), [tracks]);
  const displayAlbums = useMemo(() => albums.slice(0, 10), [albums]);
  const displayPlaylists = useMemo(() => playlists.slice(0, 10), [playlists]);

  const isEmpty =
    !isLoading &&
    displayAlbums.length === 0 &&
    displayPlaylists.length === 0 &&
    recentTracks.length === 0;

  if (isLoading && albums.length === 0 && playlists.length === 0 && tracks.length === 0) {
    return null;
  }

  return (
    <PageLayout overflowHidden>
      {/* Header */}
      <div className="mt-8 mb-6 px-2">
        <h1 className="text-4xl font-bold text-primary">Welcome Back</h1>
        <p className="text-muted-foreground mt-1">
          Here's some music for you today.
        </p>
      </div>
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-overlay overflow-x-hidden px-2 space-y-8  scroll-mask-y",
          (displayAlbums.length > 0 || displayPlaylists.length > 0) &&
            (isPlayerVisible ? "pb-player-bar" : "pb-8"),
          isEmpty && "flex flex-col",
          isEmpty && isPlayerVisible && "pb-player-bar",
        )}
      >
        {/* Albums Section */}
        {displayAlbums.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Albums</h2>
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setPage("albums")}
              >
                See all <ChevronRight size={16} />
              </Button>
            </div>

            <div className="flex overflow-x-overlay gap-4 pb-4 -mx-2 px-2">
              {displayAlbums.map((album) => (
                <AlbumCardItem
                  key={album.id}
                  album={album}
                  onPlay={handlePlayAlbum}
                  onPlayNext={handlePlayNextAlbum}
                  onAddToQueue={handleAddAlbumToQueue}
                  onOpenDetail={openAlbumDetail}
                />
              ))}
            </div>
          </section>
        )}

        {/* Playlists Section */}
        {displayPlaylists.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Playlists</h2>
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setPage("playlists")}
              >
                See all <ChevronRight size={16} />
              </Button>
            </div>

            <div className="flex overflow-x-overlay gap-4 pb-4 -mx-2 px-2">
              {displayPlaylists.map((p) => (
                <PlaylistCardItem
                  key={p.id}
                  playlist={p}
                  onPlay={handlePlayPlaylist}
                  onPlayNext={handlePlayNextPlaylist}
                  onAddToQueue={handleAddPlaylistToQueue}
                  onOpenDetail={openPlaylistDetail}
                  onEdit={setEditingPlaylist}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          </section>
        )}

        {/* Songs Section */}
        {recentTracks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Recently Added
              </h2>
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setPage("songs")}
              >
                See all <ChevronRight size={16} />
              </Button>
            </div>

            <div className="flex flex-col gap-1">
              {recentTracks.map((track) => (
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
                />
              ))}
            </div>
          </section>
        )}

        {!isLoading &&
          displayAlbums.length === 0 &&
          displayPlaylists.length === 0 &&
          recentTracks.length === 0 && (
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
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Playlist?"
        description={`This action cannot be undone. This will permanently delete the playlist "${playlistToDelete?.name}".`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        loadingText="Deleting..."
      />
    </PageLayout>
  );
});
