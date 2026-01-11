import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check } from "lucide-react";
import { Track, getTracks } from "@/lib/api";
import { usePlaylistStore } from "@/stores/playlist-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import placeholderArt from "@/assets/placeholder-art.jpg";

interface TrackSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistId: number;
  existingTrackIds: Set<number>;
}

export function TrackSelectDialog({
  open,
  onOpenChange,
  playlistId,
  existingTrackIds,
}: TrackSelectDialogProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(
    new Set()
  );
  const [isAdding, setIsAdding] = useState(false);

  const addToPlaylist = usePlaylistStore((s) => s.addToPlaylist);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getTracks()
        .then((data) => {
          // Sort by artist, then title
          const sorted = data.sort((a, b) => {
            const artistA = a.artist || "";
            const artistB = b.artist || "";
            return (
              artistA.localeCompare(artistB) || a.title.localeCompare(b.title)
            );
          });
          setTracks(sorted);
        })
        .finally(() => setIsLoading(false));
      setSelectedTrackIds(new Set());
    }
  }, [open]);

  const filteredTracks = useMemo(() => {
    // Filter out existing tracks first
    const available = tracks.filter((t) => !existingTrackIds.has(t.id));

    if (!search.trim()) return available;
    const lower = search.toLowerCase();
    return available.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        (t.artist && t.artist.toLowerCase().includes(lower)) ||
        (t.album && t.album.toLowerCase().includes(lower))
    );
  }, [tracks, search, existingTrackIds]);

  const toggleSelection = (trackId: number) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedTrackIds.size === 0) return;
    setIsAdding(true);
    try {
      // Add all selected tracks
      // We can do this in parallel
      await Promise.all(
        Array.from(selectedTrackIds).map((id) => addToPlaylist(playlistId, id))
      );
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden outline-none">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle>Add Songs to Playlist</DialogTitle>
          <div className="relative mt-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-indigo-500"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 pt-0 custom-scrollbar">
          {isLoading ? (
            <div className="text-gray-500 text-center py-8">
              Loading tracks...
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No tracks found
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredTracks.map((track) => {
                const isSelected = selectedTrackIds.has(track.id);
                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                    onClick={() => toggleSelection(track.id)}
                  >
                    <img
                      src={
                        track.artwork_path
                          ? convertFileSrc(track.artwork_path)
                          : placeholderArt
                      }
                      className="w-10 h-10 rounded object-cover bg-neutral-800 shrink-0"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium truncate ${
                          isSelected ? "text-indigo-400" : "text-white"
                        }`}
                      >
                        {track.title}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {track.artist || "Unknown Artist"}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-indigo-500 border-indigo-500 text-white"
                          : "border-gray-600 text-transparent"
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 flex justify-end gap-2 bg-neutral-900">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedTrackIds.size === 0 || isAdding}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isAdding
              ? "Adding..."
              : `Add ${
                  selectedTrackIds.size > 0 ? selectedTrackIds.size : ""
                } Songs`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
