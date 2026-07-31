import { useState, useEffect, useMemo, useDeferredValue } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check, ListMusic } from "lucide-react";
import { addTrackToPlaylist } from "@/lib/api";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { useSelectionStore } from "@/stores/selection-store";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

interface PlaylistSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function PlaylistSelectorDialog({
  open,
  onOpenChange,
  onComplete,
}: PlaylistSelectorDialogProps) {
  const playlists = usePlaylistStore((s) => s.playlists);
  const refreshPlaylists = usePlaylistStore((s) => s.refreshPlaylists);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    null,
  );
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedPlaylistId(null);
      setSearch("");
    }
  }, [open]);

  const filteredPlaylists = useMemo(() => {
    if (!deferredSearch.trim()) return playlists;
    const lower = deferredSearch.toLowerCase();
    return playlists.filter((p) => p.name.toLowerCase().includes(lower));
  }, [playlists, deferredSearch]);

  const handleConfirm = async () => {
    if (selectedPlaylistId === null) return;
    const trackIds = useSelectionStore.getState().getSelectedIds();
    if (trackIds.length === 0) return;

    setIsAdding(true);
    try {
      for (const trackId of trackIds) {
        await addTrackToPlaylist(selectedPlaylistId, trackId);
      }
      await refreshPlaylists();
      toast.success(`Added ${trackIds.length} track${trackIds.length !== 1 ? "s" : ""} to playlist`);
      onOpenChange(false);
      onComplete();
    } catch (e) {
      logger.error("Failed to add tracks to playlist", e);
      toast.error("Failed to add tracks to playlist");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground max-w-md h-[60vh] flex flex-col p-0 overflow-hidden outline-none">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle>Add to Playlist</DialogTitle>
          <div className="relative mt-2">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search playlists..."
              className="pl-9"
              autoFocus
              autoComplete="off"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 pt-0">
          {filteredPlaylists.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              {search ? "No playlists found" : "No playlists yet"}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredPlaylists.map((playlist) => {
                const isSelected = selectedPlaylistId === playlist.id;
                return (
                  <button
                    type="button"
                    key={playlist.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-left ${
                      isSelected ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                    onClick={() => setSelectedPlaylistId(playlist.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelectedPlaylistId(playlist.id);
                    }}
                  >
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <ListMusic size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium truncate ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {playlist.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {playlist.track_count} track{playlist.track_count !== 1 ? "s" : ""}
                        {playlist.description ? ` · ${playlist.description}` : ""}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
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
            disabled={selectedPlaylistId === null || isAdding}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isAdding
              ? "Adding..."
              : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
