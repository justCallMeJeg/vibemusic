import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigationStore } from "@/stores/navigation-store";
import { useAudioStore } from "@/stores/audio-store";
import {
  getAlbumTracks,
  getPlaylistTracks,
  Track,
  Album,
  Playlist,
  search,
  SearchResults,
} from "@/lib/api";
import {
  Disc,
  ListMusic,
  Music,
  Play,
  Shuffle,
  Plus,
  Loader2,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";

export function GlobalSearch() {
  const isSearchOpen = useNavigationStore((s) => s.isSearchOpen);
  const setSearchOpen = useNavigationStore((s) => s.setSearchOpen);

  const [results, setResults] = useState<SearchResults>({
    tracks: [],
    albums: [],
    playlists: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const openPlaylistDetail = useNavigationStore((s) => s.openPlaylistDetail);
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isSearchOpen, setSearchOpen]);

  // Clear query when opening
  useEffect(() => {
    if (isSearchOpen) {
      setSearchQuery("");
    }
  }, [isSearchOpen]);

  // Debounced Search
  useEffect(() => {
    if (!isSearchOpen) return;

    const handler = setTimeout(() => {
      setLoading(true);
      search(searchQuery)
        .then(setResults)
        .catch((e) => console.error("Search failed:", e))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, isSearchOpen]);

  // Actions
  const handlePlayTrack = useCallback(
    (track: Track) => {
      play(track, results.tracks); // Play within context of search results? Or just track?
      // Better to pass just the track for now, or the track + search results as context
      setSearchOpen(false);
    },
    [play, results.tracks, setSearchOpen]
  );

  const handlePlayAlbum = useCallback(
    async (albumId: number, shuffle = false) => {
      try {
        const albumTracks = await getAlbumTracks(albumId);
        if (albumTracks.length === 0) return;
        const queue = shuffle
          ? [...albumTracks].sort(() => Math.random() - 0.5)
          : albumTracks;
        play(queue[0], queue);
        setSearchOpen(false);
      } catch (e) {
        console.error("Failed to play album", e);
      }
    },
    [play, setSearchOpen]
  );

  const handlePlayPlaylist = useCallback(
    async (playlistId: number, shuffle = false) => {
      try {
        const playlistTracks = await getPlaylistTracks(playlistId);
        if (playlistTracks.length === 0) return;
        const queue = shuffle
          ? [...playlistTracks].sort(() => Math.random() - 0.5)
          : playlistTracks;
        play(queue[0], queue);
        setSearchOpen(false);
      } catch (e) {
        console.error("Failed to play playlist", e);
      }
    },
    [play, setSearchOpen]
  );

  const handleAddToQueue = useCallback(
    async (item: Track | Album | Playlist, type: string) => {
      try {
        if (type === "track") {
          addToQueue(item as Track);
          toast.success("Added to queue");
        } else if (type === "album") {
          const t = await getAlbumTracks((item as Album).id);
          t.forEach((x) => addToQueue(x));
          toast.success(`Added ${t.length} tracks`);
        } else {
          const t = await getPlaylistTracks((item as Playlist).id);
          t.forEach((x) => addToQueue(x));
          toast.success(`Added ${t.length} tracks`);
        }
      } catch {
        toast.error("Failed to add to queue");
      }
    },
    [addToQueue]
  );

  const handlePlayNext = useCallback(
    async (item: Track | Album | Playlist, type: string) => {
      try {
        if (type === "track") {
          playNext(item as Track);
          toast.success("Playing next");
        } else if (type === "album") {
          const t = await getAlbumTracks((item as Album).id);
          [...t].reverse().forEach((x) => playNext(x));
          toast.success("Album playing next");
        } else {
          const t = await getPlaylistTracks((item as Playlist).id);
          [...t].reverse().forEach((x) => playNext(x));
          toast.success("Playlist playing next");
        }
      } catch {
        toast.error("Failed");
      }
    },
    [playNext]
  );

  // Item renderer
  const renderItem = useCallback(
    (
      id: string,
      type: "track" | "album" | "playlist",
      data: Track | Album | Playlist,
      icon: React.ReactNode,
      primary: string,
      secondary: string,
      onSelect: () => void,
      keywords: string[] = []
    ) => {
      return (
        <ContextMenu key={id}>
          <ContextMenuTrigger asChild>
            <CommandItem
              value={id} // Unique ID for cmdk
              onSelect={onSelect}
              className="py-1.5"
            >
              {icon}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate block font-medium group-data-[selected=true]:text-primary transition-colors">
                  {primary}
                </span>
                <span className="text-xs text-neutral-500 truncate block">
                  {secondary}
                </span>
              </div>
            </CommandItem>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem
              onSelect={() => {
                if (type === "track") handlePlayTrack(data as Track);
                else if (type === "album") handlePlayAlbum((data as Album).id);
                else handlePlayPlaylist((data as Playlist).id);
              }}
            >
              <Play className="mr-2 h-4 w-4" /> Play
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => {
                if (type === "track") handlePlayTrack(data as Track);
                else if (type === "album")
                  handlePlayAlbum((data as Album).id, true);
                else handlePlayPlaylist((data as Playlist).id, true);
              }}
            >
              <Shuffle className="mr-2 h-4 w-4" /> Shuffle
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => handlePlayNext(data, type)}>
              <ListMusic className="mr-2 h-4 w-4" /> Play Next
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => handleAddToQueue(data, type)}>
              <Plus className="mr-2 h-4 w-4" /> Add to Queue
            </ContextMenuItem>
            {type !== "track" && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={onSelect}>
                  <Disc className="mr-2 h-4 w-4" /> Go to{" "}
                  {type === "album" ? "Album" : "Playlist"}
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      );
    },
    [
      handlePlayTrack,
      handlePlayAlbum,
      handlePlayPlaylist,
      handlePlayNext,
      handleAddToQueue,
    ]
  );

  const songsSection = useMemo(
    () =>
      results.tracks.length > 0 && (
        <CommandGroup heading="Songs">
          {results.tracks.map((t) =>
            renderItem(
              `track-${t.id}`,
              "track",
              t,
              <Music className="mr-2 h-3 w-3 opacity-70 shrink-0" />,
              t.title,
              t.artist ?? "Unknown",
              () => handlePlayTrack(t)
            )
          )}
        </CommandGroup>
      ),
    [results.tracks, renderItem, handlePlayTrack]
  );

  const albumsSection = useMemo(
    () =>
      results.albums.length > 0 && (
        <CommandGroup heading="Albums">
          {results.albums.map((a) =>
            renderItem(
              `album-${a.id}`,
              "album",
              a,
              <Disc className="mr-2 h-3 w-3 opacity-70 shrink-0" />,
              a.title,
              a.artist_name ?? "Unknown",
              () => {
                openAlbumDetail(a.id);
                setSearchOpen(false);
              }
            )
          )}
        </CommandGroup>
      ),
    [results.albums, renderItem, openAlbumDetail, setSearchOpen]
  );

  const playlistsSection = useMemo(
    () =>
      results.playlists.length > 0 && (
        <CommandGroup heading="Playlists">
          {results.playlists.map((p) =>
            renderItem(
              `playlist-${p.id}`,
              "playlist",
              p,
              <ListMusic className="mr-2 h-3 w-3 opacity-70 shrink-0" />,
              p.name,
              `${p.track_count} tracks`,
              () => {
                openPlaylistDetail(p.id);
                setSearchOpen(false);
              }
            )
          )}
        </CommandGroup>
      ),
    [results.playlists, renderItem, openPlaylistDetail, setSearchOpen]
  );

  return (
    <CommandDialog
      open={isSearchOpen}
      onOpenChange={setSearchOpen}
      commandProps={{
        shouldFilter: false, // DISABLE CLIENT SIDE FILTERING!
      }}
    >
      <CommandInput
        placeholder="Search tracks, albums, or playlists..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[300px]">
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Searching...
          </div>
        )}
        {!loading &&
        searchQuery.length > 0 &&
        results.tracks.length === 0 &&
        results.albums.length === 0 &&
        results.playlists.length === 0 ? (
          <CommandEmpty>No results found.</CommandEmpty>
        ) : null}

        {!loading && (
          <>
            {songsSection}
            {results.tracks.length > 0 &&
              (results.albums.length > 0 || results.playlists.length > 0) && (
                <CommandSeparator />
              )}
            {albumsSection}
            {results.albums.length > 0 && results.playlists.length > 0 && (
              <CommandSeparator />
            )}
            {playlistsSection}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
