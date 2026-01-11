import { getAlbumTracks } from "@/lib/api";
import { useNavigationStore } from "@/stores/navigation-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import placeholderArt from "@/assets/placeholder-art.jpg";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Play, Shuffle, ListPlus, Disc } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { useAudioStore } from "@/stores/audio-store";
import { toast } from "react-hot-toast";
import { useLibraryStore } from "@/stores/library-store";

export default function AlbumsPage() {
  const albums = useLibraryStore((s) => s.albums);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);

  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  const handlePlayAlbum = async (albumId: number, shuffle: boolean = false) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) {
        toast.error("Album is empty");
        return;
      }

      let trackToPlay = tracks[0];
      let queue = tracks;

      if (shuffle) {
        queue = [...tracks].sort(() => Math.random() - 0.5);
        trackToPlay = queue[0];
      }

      play(trackToPlay, queue);
    } catch (e) {
      console.error("Failed to play album:", e);
      toast.error("Failed to play album");
    }
  };

  const handleAddToQueue = async (albumId: number) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) return;

      // Add one by one for now (store optimization needed for bulk add)
      tracks.forEach((track) => addToQueue(track));
      toast.success(`Added ${tracks.length} tracks to queue`);
    } catch (e) {
      console.error("Failed to add album to queue:", e);
      toast.error("Failed to add to queue");
    }
  };

  const handlePlayNext = async (albumId: number) => {
    try {
      const tracks = await getAlbumTracks(albumId);
      if (tracks.length === 0) return;

      // Reverse because playNext inserts after current track
      [...tracks].reverse().forEach((track) => playNext(track));
      toast.success("Playing album next");
    } catch (e) {
      console.error("Failed to play album next:", e);
      toast.error("Failed to play next");
    }
  };

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading albums...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="mt-8 flex items-center justify-between mb-6 px-2">
        <h1 className="text-3xl font-bold">Albums</h1>
      </div>

      <div className="flex-1 overflow-y-auto scroll-mask-y px-2">
        {albums.length === 0 ? (
          <EmptyState
            icon={Disc}
            title="No albums found"
            description="Import music using the sidebar button to get started."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-8">
            {albums.map((album) => {
              const artworkSrc = album.artwork_path
                ? convertFileSrc(album.artwork_path)
                : placeholderArt;

              return (
                <ContextMenu key={album.id}>
                  <ContextMenuTrigger>
                    <div
                      onClick={() => openAlbumDetail(album.id)}
                      className="flex flex-col rounded-lg p-3 hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <img
                        className="aspect-square w-full rounded-lg object-cover bg-neutral-800 mb-3 group-hover:scale-[1.02] transition-transform"
                        src={artworkSrc}
                        onError={(e) => {
                          e.currentTarget.src = placeholderArt;
                        }}
                        alt={album.title}
                      />
                      <p className="text-white text-sm font-bold line-clamp-1">
                        {album.title}
                      </p>
                      <p className="text-gray-400 text-xs line-clamp-1">
                        {album.artist_name || "Unknown Artist"}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {album.track_count} tracks •{" "}
                        {formatDuration(album.total_duration_ms)}
                      </p>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onSelect={() => handlePlayAlbum(album.id, false)}
                    >
                      <Play className="mr-2 h-4 w-4" /> Play
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => handlePlayAlbum(album.id, true)}
                    >
                      <Shuffle className="mr-2 h-4 w-4" /> Shuffle
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handlePlayNext(album.id)}>
                      <ListPlus className="mr-2 h-4 w-4" /> Play Next
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => handleAddToQueue(album.id)}
                    >
                      <ListPlus className="mr-2 h-4 w-4" /> Add to Queue
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
