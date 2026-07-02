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
import { useLibraryStore } from "@/stores/library-store";
import { logger } from "@/lib/logger";
import { ArtworkImage } from "../shared/artwork-image";
import { ScrollingText } from "../shared/scrolling-text";

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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(
    new Set(),
  );
  const [isAdding, setIsAdding] = useState(false);

  const addToPlaylist = useLibraryStore((s) => s.addToPlaylist);

  const dialogKey = open ? "open" : "closed";

  useEffect(() => {
    getTracks()
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          const artistA = a.artist || "";
          const artistB = b.artist || "";
          return (
            artistA.localeCompare(artistB) || a.title.localeCompare(b.title)
          );
        });
        setTracks(sorted);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredTracks = useMemo(() => {
    // Filter out existing tracks first
    const available = tracks.filter((t) => !existingTrackIds.has(t.id));

    if (!search.trim()) return available;
    const lower = search.toLowerCase();
    return available.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        (t.artist && t.artist.toLowerCase().includes(lower)) ||
        (t.album && t.album.toLowerCase().includes(lower)),
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
        Array.from(selectedTrackIds).map((id) => addToPlaylist(playlistId, id)),
      );
      onOpenChange(false);
    } catch (e) {
      logger.error("Failed to add tracks", e);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog key={dialogKey} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden outline-none">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle>Add Songs to Playlist</DialogTitle>
          <div className="relative mt-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              className="pl-9"
              autoFocus
              autoComplete="off"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 pt-0 custom-scrollbar">
          {isLoading ? (
            <div className="text-muted-foreground text-center py-8">
              Loading tracks...
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              No tracks found
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredTracks.map((track) => {
                const isSelected = selectedTrackIds.has(track.id);
                return (
                  <button
                    type="button"
                    key={track.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-left ${
                      isSelected ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                    onClick={() => toggleSelection(track.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        toggleSelection(track.id);
                    }}
                  >
                    <ArtworkImage
                      src={track.artwork_path}
                      className="w-10 h-10 rounded bg-card shrink-0"
                      placeholderType="track"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium truncate ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        <ScrollingText>{track.title}</ScrollingText>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {track.artist || "Unknown Artist"}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-primary border-primary text-white"
                          : "border-muted-foreground text-transparent"
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-popover">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedTrackIds.size === 0 || isAdding}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
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
