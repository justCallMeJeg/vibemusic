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
  getTracks,
  getAlbums,
  getPlaylists,
  getAlbumTracks,
  getPlaylistTracks,
  Track,
  Album,
  Playlist,
} from "@/lib/api";
import { Disc, ListMusic, Music, Play, Shuffle, Plus } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "react-hot-toast";

// Maximum items per category for performance
const MAX_ITEMS = 20;

export function GlobalSearch() {
  const isSearchOpen = useNavigationStore((s) => s.isSearchOpen);
  const setSearchOpen = useNavigationStore((s) => s.setSearchOpen);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState("");

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

  // Pre-fetch data on mount to avoid lag when opening
  useEffect(() => {
    Promise.all([getTracks(), getAlbums(), getPlaylists()])
      .then(([t, a, p]) => {
        setTracks(t);
        setAlbums(a);
        setPlaylists(p);
      })
      .catch((e) => console.error("Failed to fetch:", e));
  }, []); // Run once on mount

  // Actions
  const handlePlayTrack = useCallback(
    (track: Track) => {
      play(track, tracks);
      setSearchOpen(false);
    },
    [play, tracks, setSearchOpen]
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

  // Limited items for performance
  const displayTracks = useMemo(() => tracks.slice(0, MAX_ITEMS), [tracks]);
  const displayAlbums = useMemo(() => albums.slice(0, MAX_ITEMS), [albums]);
  const displayPlaylists = useMemo(
    () => playlists.slice(0, MAX_ITEMS),
    [playlists]
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
              value={id}
              keywords={keywords}
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

  // Sections with unique IDs and search keywords
  const songsSection = useMemo(
    () =>
      displayTracks.length > 0 && (
        <CommandGroup heading="Songs">
          {displayTracks.map((t) =>
            renderItem(
              `track-${t.id}`,
              "track",
              t,
              <Music className="mr-2 h-3 w-3 opacity-70 shrink-0" />,
              t.title,
              t.artist ?? "Unknown",
              () => handlePlayTrack(t),
              [t.title, t.artist ?? ""]
            )
          )}
        </CommandGroup>
      ),
    [displayTracks, renderItem, handlePlayTrack]
  );

  const albumsSection = useMemo(
    () =>
      displayAlbums.length > 0 && (
        <CommandGroup heading="Albums">
          {displayAlbums.map((a) =>
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
              },
              [a.title, a.artist_name ?? ""]
            )
          )}
        </CommandGroup>
      ),
    [displayAlbums, renderItem, openAlbumDetail, setSearchOpen]
  );

  const playlistsSection = useMemo(
    () =>
      displayPlaylists.length > 0 && (
        <CommandGroup heading="Playlists">
          {displayPlaylists.map((p) =>
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
              },
              [p.name]
            )
          )}
        </CommandGroup>
      ),
    [displayPlaylists, renderItem, openPlaylistDetail, setSearchOpen]
  );

  return (
    <CommandDialog
      open={isSearchOpen}
      onOpenChange={setSearchOpen}
      commandProps={{ onValueChange: (v) => setSelectedValue(v || "") }}
    >
      <CommandInput
        placeholder="Search tracks, albums, or playlists..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[300px]">
        <CommandEmpty>No results found.</CommandEmpty>
        {searchQuery.length > 0 ? (
          <>
            {songsSection}
            <CommandSeparator />
            {albumsSection}
            <CommandSeparator />
            {playlistsSection}
          </>
        ) : (
          <>
            {albumsSection}
            <CommandSeparator />
            {playlistsSection}
            <CommandSeparator />
            {songsSection}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
