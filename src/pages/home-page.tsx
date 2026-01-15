import { useState } from "react";
import { useNavigationStore } from "@/stores/navigation-store";
import { logger } from "@/lib/logger";
import MusicListItem from "@/components/shared/item/music-list";
import AlbumCard from "@/components/shared/item/album-card";
import PlaylistCard from "@/components/shared/item/playlist-card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaylistEditDialog } from "@/components/dialogs/playlist-edit-dialog";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { Playlist } from "@/lib/api";

import { EmptyState } from "@/components/shared/empty-state";
import { useLibraryStore } from "@/stores/library-store";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useIsPlayerVisible } from "@/stores/audio-store";

export default function HomePage() {
  const albums = useLibraryStore((s) => s.albums);
  const tracks = useLibraryStore((s) => s.tracks);
  const playlists = useLibraryStore((s) => s.playlists);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);

  const setPage = useNavigationStore((s) => s.setPage);

  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null
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

  // Derived state for display
  const recentTracks = tracks.slice(0, 20);
  const displayAlbums = albums.slice(0, 10);
  const displayPlaylists = playlists;

  const isEmpty =
    !isLoading &&
    displayAlbums.length === 0 &&
    displayPlaylists.length === 0 &&
    recentTracks.length === 0;

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mt-8 mb-6 px-2">
        <h1 className="text-4xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Welcome Back
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's some music for you today.
        </p>
      </div>
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-8 custom-scrollbar scroll-mask-y",
          (displayAlbums.length > 0 || displayPlaylists.length > 0) &&
            (isPlayerVisible ? "pb-39" : "pb-8"),
          isEmpty && "flex flex-col"
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
                <AlbumCard key={album.id} album={album} size="compact" />
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
              {displayPlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  size="compact"
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
                <MusicListItem
                  key={track.id}
                  track={track}
                  context={recentTracks}
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
    </div>
  );
}
