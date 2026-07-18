import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
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
import { Disc, ListMusic, Music } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { SearchResultItem } from "@features/search/components/search-result-item";
import { SearchResultsView } from "@features/search/components/search-results";

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

    let cancelled = false;

    const handler = setTimeout(() => {
      setLoading(true);
      search(searchQuery)
        .then((res) => {
          if (!cancelled) setResults(res);
        })
        .catch((e) => {
          logger.error("Search failed", e);
          if (!cancelled) toast.error("Search failed");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handler);
    };
  }, [searchQuery, isSearchOpen]);

  // Actions
  const handlePlayTrack = useCallback(
    (track: Track) => {
      play(track, results.tracks); // Play within context of search results? Or just track?
      // Better to pass just the track for now, or the track + search results as context
      setSearchOpen(false);
    },
    [play, results.tracks, setSearchOpen],
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
        logger.error("Failed to play album", e);
      }
    },
    [play, setSearchOpen],
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
        logger.error("Failed to play playlist", e);
      }
    },
    [play, setSearchOpen],
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
    [addToQueue],
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
    [playNext],
  );

  const songsSection = useMemo(
    () =>
      results.tracks.length > 0 && (
        <CommandGroup heading="Songs">
          {results.tracks.map((t) => (
            <SearchResultItem
              key={`track-${t.id}`}
              id={`track-${t.id}`}
              icon={<Music className="mr-2 h-3 w-3 opacity-70 shrink-0" />}
              primary={t.title}
              secondary={t.artist ?? "Unknown"}
              onSelect={() => handlePlayTrack(t)}
              onPlay={() => handlePlayTrack(t)}
              onShuffle={() => handlePlayTrack(t)}
              onPlayNext={() => handlePlayNext(t, "track")}
              onAddToQueue={() => handleAddToQueue(t, "track")}
            />
          ))}
        </CommandGroup>
      ),
    [results.tracks, handlePlayTrack, handlePlayNext, handleAddToQueue],
  );

  const albumsSection = useMemo(
    () =>
      results.albums.length > 0 && (
        <CommandGroup heading="Albums">
          {results.albums.map((a) => (
            <SearchResultItem
              key={`album-${a.id}`}
              id={`album-${a.id}`}
              icon={<Disc className="mr-2 h-3 w-3 opacity-70 shrink-0" />}
              primary={a.title}
              secondary={a.artist_name ?? "Unknown"}
              onSelect={() => {
                openAlbumDetail(a.id);
                setSearchOpen(false);
              }}
              onPlay={() => handlePlayAlbum(a.id)}
              onShuffle={() => handlePlayAlbum(a.id, true)}
              onPlayNext={() => handlePlayNext(a, "album")}
              onAddToQueue={() => handleAddToQueue(a, "album")}
              showGoTo
              goToLabel="Album"
              onGoTo={() => {
                openAlbumDetail(a.id);
                setSearchOpen(false);
              }}
            />
          ))}
        </CommandGroup>
      ),
    [
      results.albums,
      openAlbumDetail,
      setSearchOpen,
      handlePlayAlbum,
      handlePlayNext,
      handleAddToQueue,
    ],
  );

  const playlistsSection = useMemo(
    () =>
      results.playlists.length > 0 && (
        <CommandGroup heading="Playlists">
          {results.playlists.map((p) => (
            <SearchResultItem
              key={`playlist-${p.id}`}
              id={`playlist-${p.id}`}
              icon={<ListMusic className="mr-2 h-3 w-3 opacity-70 shrink-0" />}
              primary={p.name}
              secondary={`${p.track_count} tracks`}
              onSelect={() => {
                openPlaylistDetail(p.id);
                setSearchOpen(false);
              }}
              onPlay={() => handlePlayPlaylist(p.id)}
              onShuffle={() => handlePlayPlaylist(p.id, true)}
              onPlayNext={() => handlePlayNext(p, "playlist")}
              onAddToQueue={() => handleAddToQueue(p, "playlist")}
              showGoTo
              goToLabel="Playlist"
              onGoTo={() => {
                openPlaylistDetail(p.id);
                setSearchOpen(false);
              }}
            />
          ))}
        </CommandGroup>
      ),
    [
      results.playlists,
      openPlaylistDetail,
      setSearchOpen,
      handlePlayPlaylist,
      handlePlayNext,
      handleAddToQueue,
    ],
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
      <SearchResultsView
        loading={loading}
        searchQuery={searchQuery}
        results={results}
        songsSection={songsSection}
        albumsSection={albumsSection}
        playlistsSection={playlistsSection}
      />
    </CommandDialog>
  );
}
