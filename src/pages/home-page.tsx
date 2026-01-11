import { useState } from "react";
import { getAlbumTracks, getPlaylistTracks } from "@/lib/api";
import { useNavigationStore } from "@/stores/navigation-store";
import { useAudioStore } from "@/stores/audio-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import placeholderArt from "@/assets/placeholder-art.jpg";
import MusicListItem from "@/components/shared/item/music-list";
import { Button } from "@/components/ui/button";
import { ChevronRight, Play } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
/* import { usePlaylistStore } from "@/stores/playlist-store"; */
import { PlaylistEditDialog } from "@/components/dialogs/playlist-edit-dialog";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { Pencil } from "lucide-react";
import { Playlist } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useLibraryStore } from "@/stores/library-store";

export default function HomePage() {
  const albums = useLibraryStore((s) => s.albums);
  const tracks = useLibraryStore((s) => s.tracks);
  const playlists = useLibraryStore((s) => s.playlists);
  const isLoading = useLibraryStore((s) => s.isLoading);

  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const openPlaylistDetail = useNavigationStore((s) => s.openPlaylistDetail);
  const setPage = useNavigationStore((s) => s.setPage);
  const play = useAudioStore((s) => s.play);

  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const scrollRef = useScrollMask();

  // Derived state for display
  const recentTracks = tracks.slice(0, 20);
  // Sort albums by date or random? Library store maintains sort.
  // We can just take the first few or random ones.
  // For "Quick Picks" let's just take the first 10 for now.
  const displayAlbums = albums.slice(0, 10);
  const displayPlaylists = playlists;

  const handlePlayAlbum = async (albumId: number) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) return;
      play(tracks[0], tracks);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlayPlaylist = async (playlistId: number) => {
    try {
      const tracks = await getPlaylistTracks(playlistId);
      if (tracks.length === 0) return;
      play(tracks[0], tracks);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {/* Header Loading */}
        <div className="mt-8 mb-4">
          <Skeleton className="h-10 w-64 bg-white/10" />
          <Skeleton className="h-4 w-48 mt-2 bg-white/5" />
        </div>

        <div className="pt-4 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-42 space-y-8 custom-scrollbar">
          {/* Albums Skeleton */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24 bg-white/10" />
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-none">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-40 shrink-0 space-y-3">
                  <Skeleton className="aspect-square w-full rounded-xl bg-white/5" />
                  <div>
                    <Skeleton className="h-4 w-32 bg-white/10 mb-1" />
                    <Skeleton className="h-3 w-20 bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Playlists Skeleton */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24 bg-white/10" />
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-none">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-40 shrink-0 space-y-3">
                  <Skeleton className="aspect-square w-full rounded-xl bg-white/5" />
                  <div>
                    <Skeleton className="h-4 w-24 bg-white/10 mb-1" />
                    <Skeleton className="h-3 w-16 bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Songs Skeleton */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32 bg-white/10" />
            </div>
            <div className="flex flex-col gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md">
                  <Skeleton className="w-10 h-10 rounded-md bg-white/5 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-48 bg-white/10" />
                    <Skeleton className="h-3 w-24 bg-white/5" />
                  </div>
                  <Skeleton className="h-3 w-12 bg-white/5" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mt-8 mb-6 px-2">
        <h1 className="text-4xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Welcome Back
        </h1>
        <p className="text-gray-400 mt-1">Here's some music for you today.</p>
      </div>
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-8 custom-scrollbar scroll-mask-y",
          (displayAlbums.length > 0 || displayPlaylists.length > 0) && "pb-42"
        )}
      >
        {/* Albums Section */}
        {displayAlbums.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Albums</h2>
              <Button
                variant="ghost"
                className="text-sm text-gray-400 hover:text-white"
                onClick={() => setPage("albums")}
              >
                See all <ChevronRight size={16} />
              </Button>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 scrollbar-none">
              {displayAlbums.map((album) => (
                <ContextMenu key={album.id}>
                  <ContextMenuTrigger>
                    <div
                      onClick={() => openAlbumDetail(album.id)}
                      className="w-40 shrink-0 group cursor-pointer space-y-3"
                    >
                      <div className="aspect-square w-full rounded-xl bg-neutral-800 overflow-hidden relative">
                        <img
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          src={
                            album.artwork_path
                              ? convertFileSrc(album.artwork_path)
                              : placeholderArt
                          }
                          onError={(e) => {
                            e.currentTarget.src = placeholderArt;
                          }}
                          alt={album.title}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayAlbum(album.id);
                            }}
                          >
                            <Play
                              fill="currentColor"
                              className="ml-1"
                              size={24}
                            />
                          </button>
                        </div>
                      </div>
                      <div>
                        <h3
                          className="font-semibold text-white truncate"
                          title={album.title}
                        >
                          {album.title}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {album.artist_name || "Unknown Artist"}
                        </p>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => handlePlayAlbum(album.id)}>
                      <Play className="mr-2 h-4 w-4" /> Play
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </section>
        )}

        {/* Playlists Section */}
        {displayPlaylists.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Playlists</h2>
              <Button
                variant="ghost"
                className="text-sm text-gray-400 hover:text-white"
                onClick={() => setPage("playlists")}
              >
                See all <ChevronRight size={16} />
              </Button>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 scrollbar-none">
              {displayPlaylists.map((playlist) => (
                <ContextMenu key={playlist.id}>
                  <ContextMenuTrigger>
                    <div
                      onClick={() => openPlaylistDetail(playlist.id)}
                      className="w-40 shrink-0 group cursor-pointer space-y-3"
                    >
                      <div className="aspect-square w-full rounded-xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center relative overflow-hidden">
                        {playlist.artwork_path ? (
                          <img
                            src={convertFileSrc(playlist.artwork_path)}
                            alt={playlist.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-4xl font-bold text-white/50 select-none">
                            {playlist.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPlaylist(playlist.id);
                            }}
                          >
                            <Play
                              fill="currentColor"
                              className="ml-1"
                              size={24}
                            />
                          </button>
                        </div>
                      </div>
                      <div>
                        <h3
                          className="font-semibold text-white truncate"
                          title={playlist.name}
                        >
                          {playlist.name}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {playlist.track_count} tracks
                        </p>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onSelect={() => handlePlayPlaylist(playlist.id)}
                    >
                      <Play className="mr-2 h-4 w-4" /> Play
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => setEditingPlaylist(playlist)}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </section>
        )}

        {/* Songs Section */}
        {recentTracks.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Recently Added</h2>
              <Button
                variant="ghost"
                className="text-sm text-gray-400 hover:text-white"
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

        {displayAlbums.length === 0 &&
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
    </div>
  );
}
