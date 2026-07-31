import { type ReactNode } from "react";
import {
  CommandEmpty,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Loader2 } from "lucide-react";
import { SearchResults } from "@/lib/api";

interface SearchResultsProps {
  loading: boolean;
  searchQuery: string;
  results: SearchResults;
  songsSection: ReactNode;
  albumsSection: ReactNode;
  playlistsSection: ReactNode;
}

export function SearchResultsView({
  loading,
  searchQuery,
  results,
  songsSection,
  albumsSection,
  playlistsSection,
}: SearchResultsProps) {
  return (
    <CommandList className="max-h-75">
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
  );
}
