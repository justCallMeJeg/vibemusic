import { useEffect, useState } from "react";
import {
  getAlbums,
  getTracks,
  Album,
  Track,
  getAlbumTracks,
  getPlaylistTracks,
} from "@/lib/api";
import { useNavigationStore } from "@/stores/navigation-store";
import { useAudioStore } from "@/stores/audio-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import placeholderArt from "@/assets/placeholder-art.jpg";
import MusicListItem from "@/components/ui/music-list";
import { Button } from "@/components/ui/button";
import { ChevronRight, Play } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { usePlaylistStore } from "@/stores/playlist-store";
import { PlaylistEditDialog } from "@/components/playlist-edit-dialog";
import { Pencil } from "lucide-react";
import { Playlist } from "@/lib/api";

export default function HomePage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  /* const [playlists, setPlaylists] = useState<Playlist[]>([]); */
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const openPlaylistDetail = useNavigationStore((s) => s.openPlaylistDetail);
  const setPage = useNavigationStore((s) => s.setPage);
  const play = useAudioStore((s) => s.play);

  /* Use store for playlists to ensure updates (like edits) are reflected immediately */
  const { playlists, fetchPlaylists } = usePlaylistStore();

  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [albumsData, tracksData] = await Promise.all([
          getAlbums().catch((e) => {
            console.error("Failed to fetch albums:", e);
            return [];
          }),
          getTracks().catch((e) => {
            console.error("Failed to fetch tracks:", e);
            return [];
          }),
        ]);

        setAlbums(albumsData);
        // Optimization: Limit rendering to 20 items
        setTracks(tracksData.slice(0, 20));
      } catch (error) {
        console.error("Failed to load home data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mt-8 mb-4">
        <h1 className="text-4xl font-bold bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Welcome Back
        </h1>
        <p className="text-gray-400 mt-1">Here's some music for you today.</p>
      </div>
      <div className="pt-4 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-42 space-y-8 custom-scrollbar scroll-mask-y">
        {/* Albums Section */}
        {albums.length > 0 && (
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

            <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-none">
              {albums.map((album) => (
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
        {playlists.length > 0 && (
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

            <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-none">
              {playlists.map((playlist) => (
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
        {tracks.length > 0 && (
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
              {tracks.map((track) => (
                <MusicListItem key={track.id} track={track} context={tracks} />
              ))}
            </div>
          </section>
        )}

        {albums.length === 0 &&
          playlists.length === 0 &&
          tracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-full bg-white/5 mb-4">
                <Play size={48} className="text-gray-500" />
              </div>
              <h2 className="text-xl font-bold">Your library is empty</h2>
              <p className="text-gray-400 mt-2 mb-6 max-w-sm">
                Import your local music to get started. Go to the Songs page to
                import a folder.
              </p>
              <Button onClick={() => setPage("songs")}>Go to Songs</Button>
            </div>
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
