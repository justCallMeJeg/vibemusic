import { useState, useMemo } from "react";
import { useNavigationStore } from "@/stores/navigation-store";
import {
  useAudioStore,
  useCurrentTrack,
  usePlayerStatus,
  useIsPlayerVisible,
} from "@/stores/audio-store";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { getAlbumTracks, getPlaylistTracks, Playlist } from "@/lib/api";
import { CardItem } from "@/components/shared/card-item";
import { ListItem } from "@/components/shared/list-item";
import { ArtistLinks } from "@/components/shared/artist-links";
import { Button } from "@/components/ui/button";
import { ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaylistEditDialog } from "@/components/dialogs/playlist-edit-dialog";
import { useScrollMask } from "@/hooks/use-scroll-mask";

import { EmptyState } from "@/components/shared/empty-state";
import { useLibraryStore } from "@/stores/library-store";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { PageLayout } from "@/components/shared/page-layout";
import { HomeSkeleton } from "@/components/skeletons";
import { formatDuration } from "@/lib/format";

import { useShallow } from "zustand/shallow";

export default function HomePage() {
  const { albums, tracks, playlists, isLoading } = useLibraryStore(
    useShallow((s) => ({
      albums: s.albums,
      tracks: s.tracks,
      playlists: s.playlists,
      isLoading: s.isLoading,
    })),
  );
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);

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
  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);

  const handlePlayAlbum = async (albumId: number, shuffle = false) => {
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
  };

  const handlePlayNextAlbum = async (albumId: number) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) return;
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing album next");
    } catch (e) {
      logger.error("Failed to play album next", e);
      toast.error("Failed to play next");
    }
  };

  const handleAddAlbumToQueue = async (albumId: number) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) return;
      tracks.forEach((track) => addToQueue(track));
      toast.success("Added album to queue");
    } catch (e) {
      logger.error("Failed to add album to queue", e);
    }
  };

  const handlePlayPlaylist = async (playlistId: number, shuffle = false) => {
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
  };

  const handlePlayNextPlaylist = async (playlistId: number) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) return;
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing playlist next");
    } catch (e) {
      logger.error("Failed to play playlist next", e);
      toast.error("Failed to play next");
    }
  };

  const handleAddPlaylistToQueue = async (playlistId: number) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) return;
      tracks.forEach((track) => addToQueue(track));
      toast.success("Added playlist to queue");
    } catch (e) {
      logger.error("Failed to add playlist to queue", e);
    }
  };

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

  if (
    isLoading &&
    albums.length === 0 &&
    playlists.length === 0 &&
    tracks.length === 0
  ) {
    return <HomeSkeleton />;
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
          "flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-8  scroll-mask-y",
          (displayAlbums.length > 0 || displayPlaylists.length > 0) &&
            (isPlayerVisible ? "pb-player-bar" : "pb-8"),
          isEmpty && "flex flex-col",
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

            <div className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 scrollbar-none">
              {displayAlbums.map((album) => (
                <CardItem
                  key={album.id}
                  title={album.title}
                  subtitle={album.artist_name || "Unknown Artist"}
                  artworkSrc={album.artwork_path || undefined}
                  artworkType="album"
                  variant="compact"
                  onClick={() => openAlbumDetail(album.id)}
                  onPlay={() => handlePlayAlbum(album.id)}
                  menuActions={{
                    onPlay: () => handlePlayAlbum(album.id),
                    onShuffle: () => handlePlayAlbum(album.id, true),
                    onPlayNext: () => handlePlayNextAlbum(album.id),
                    onAddToQueue: () => handleAddAlbumToQueue(album.id),
                  }}
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

            <div className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 scrollbar-none">
              {displayPlaylists.map((p) => (
                <CardItem
                  key={p.id}
                  title={p.name}
                  subtitle={`${p.track_count} tracks`}
                  artworkSrc={p.artwork_path || undefined}
                  artworkType="playlist"
                  variant="compact"
                  onClick={() => openPlaylistDetail(p.id)}
                  onPlay={() => handlePlayPlaylist(p.id)}
                  menuActions={{
                    onPlay: () => handlePlayPlaylist(p.id),
                    onShuffle: () => handlePlayPlaylist(p.id, true),
                    onPlayNext: () => handlePlayNextPlaylist(p.id),
                    onAddToQueue: () => handleAddPlaylistToQueue(p.id),
                    onEdit: () => setEditingPlaylist(p),
                    onDelete: () => handleDeleteRequest(p),
                  }}
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
                <ListItem
                  key={track.id}
                  title={track.title}
                  subtitle={
                    <ArtistLinks
                      names={track.artist_names}
                      ids={track.artist_ids}
                      fallbackName={track.artist}
                      fallbackId={track.artist_id}
                    />
                  }
                  artworkSrc={track.artwork_path || undefined}
                  showArtwork
                  active={currentTrack?.id === track.id}
                  isPlaying={
                    currentTrack?.id === track.id && status === "playing"
                  }
                  onClick={() => {
                    if (currentTrack?.id === track.id) {
                      if (status === "playing") pause();
                      else resume();
                    } else {
                      play(track);
                    }
                  }}
                  trailing={
                    <p className="text-muted-foreground text-xs font-normal tabular-nums">
                      {formatDuration(track.duration_ms)}
                    </p>
                  }
                  menuActions={{
                    onPlay: () => {
                      if (currentTrack?.id === track.id) {
                        if (status === "playing") pause();
                        else resume();
                      } else {
                        play(track);
                      }
                    },
                    onPlayNext: () => playNext(track),
                    onAddToQueue: () => addToQueue(track),
                    onAddToPlaylist: (playlistId) =>
                      addToPlaylist(playlistId, track.id),
                    playlists: playlists.map((p) => ({
                      id: p.id,
                      name: p.name,
                    })),
                  }}
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
}
