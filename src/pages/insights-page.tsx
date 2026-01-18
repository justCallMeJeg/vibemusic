import { useEffect, useMemo } from "react";
import { useStatsStore } from "@/stores/stats-store";
import { useNavigationStore } from "@/stores/navigation-store";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ScrollingText } from "@/components/shared/scrolling-text";
import placeholderArt from "@/assets/placeholder-art.png";

export default function InsightsPage() {
  const { data, isLoading, fetchStats } = useStatsStore();
  const { openAlbumDetail, openArtistDetail } = useNavigationStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxGenrePlays = useMemo(() => {
    if (!data?.top_genres.length) return 1;
    return Math.max(...data.top_genres.map((g) => g.play_count));
  }, [data?.top_genres]);

  if (isLoading || !data) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <Skeleton className="h-12 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-4 overflow-hidden">
            <Skeleton className="h-48 w-48 shrink-0" />
            <Skeleton className="h-48 w-48 shrink-0" />
            <Skeleton className="h-48 w-48 shrink-0" />
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) {
      return `${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col scroll-mask-y overflow-y-auto">
      <div className="flex flex-col">
        <PageHeader title="Insights"></PageHeader>
        <p className="text-muted-foreground">
          You've listened for{" "}
          <span className="text-foreground font-bold">
            {formatTime(data.total_listening_ms)}
          </span>{" "}
          all time.
        </p>
      </div>

      {/* Top Tracks */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold px-4">Top Tracks</h2>
        <div className="px-4 flex overflow-x-auto gap-4 snap-x pb-4">
          {data.top_tracks.map((track, i) => (
            <div
              key={track.id}
              className="group relative flex-col gap-2 w-40 shrink-0 snap-start"
            >
              <div className="relative aspect-square shadow-lg">
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: `url("${
                        track.cover_image
                          ? convertFileSrc(track.cover_image)
                          : placeholderArt
                      }")`,
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                </div>
                <div className="absolute -top-2 -left-2 bg-sidebar-primary text-sidebar-primary-foreground shadow-lg rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-20 ring-2 ring-background">
                  #{i + 1}
                </div>
              </div>
              <div className="mt-2 w-full">
                <ScrollingText className="font-semibold text-sm">
                  {track.title}
                </ScrollingText>
                <div
                  className="text-sm text-muted-foreground truncate"
                  title={track.artist}
                >
                  {track.artist}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {track.play_count} plays
                </p>
              </div>
            </div>
          ))}
          {data.top_tracks.length === 0 && (
            <div className="h-40 flex items-center justify-center text-muted-foreground px-4">
              No tracks played yet
            </div>
          )}
        </div>
      </section>

      {/* Top Artists */}
      <section className="space-y-2">
        <h2 className="text-2xl font-bold px-4 pt-2">Top Artists</h2>
        <div className="flex overflow-x-auto gap-6 px-4 pb-4 snap-x">
          {data.top_artists.map((artist, i) => (
            <div
              key={artist.id}
              className="flex flex-col items-center gap-2 w-32 shrink-0 snap-start text-center cursor-pointer group/artist"
              onClick={() => openArtistDetail(artist.id)}
            >
              <div className="relative w-32 h-32 shadow-lg group">
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: `url("${
                        artist.cover_image
                          ? convertFileSrc(artist.cover_image)
                          : placeholderArt
                      }")`,
                    }}
                  />
                </div>
                <div className="absolute top-0 right-0 bg-sidebar-primary text-sidebar-primary-foreground shadow-lg rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-20 ring-2 ring-background">
                  {i + 1}
                </div>
              </div>
              <div className="w-full">
                <ScrollingText className="font-semibold text-sm text-center">
                  {artist.name}
                </ScrollingText>
                <p className="text-xs text-muted-foreground">
                  {artist.play_count} plays
                </p>
              </div>
            </div>
          ))}
          {data.top_artists.length === 0 && (
            <div className="h-32 flex items-center justify-center text-muted-foreground px-4">
              No artists played yet
            </div>
          )}
        </div>
      </section>

      {/* Top Albums */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold px-4">Top Albums</h2>
        <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x">
          {data.top_albums.map((album, i) => (
            <div
              key={album.id}
              className="group relative flex-col gap-2 w-40 shrink-0 snap-start cursor-pointer"
              onClick={() => openAlbumDetail(album.id)}
            >
              <div className="relative aspect-square shadow-lg">
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: `url("${
                        album.cover_image
                          ? convertFileSrc(album.cover_image)
                          : placeholderArt
                      }")`,
                    }}
                  />
                </div>
                <div className="absolute -top-2 -left-2 bg-sidebar-primary text-sidebar-primary-foreground shadow-lg rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-20 ring-2 ring-background">
                  #{i + 1}
                </div>
              </div>
              <div className="mt-2 w-full">
                <ScrollingText className="font-semibold text-sm">
                  {album.title}
                </ScrollingText>
                <div
                  className="text-sm text-muted-foreground truncate"
                  title={album.artist}
                >
                  {album.artist}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {album.play_count} plays
                </p>
              </div>
            </div>
          ))}
          {data.top_albums.length === 0 && (
            <div className="h-40 flex items-center justify-center text-muted-foreground px-4">
              No albums played yet
            </div>
          )}
        </div>
      </section>

      {/* Genres Wall */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold px-4">Vibe Check</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 items-baseline pb-8">
          {data.top_genres.length > 0 ? (
            data.top_genres.map((genre) => {
              const isMostPlayed = genre.play_count === maxGenrePlays;
              const size = Math.max(1, (genre.play_count / maxGenrePlays) * 4); // 1rem to 4rem relative size

              return (
                <div
                  key={genre.genre}
                  className={cn(
                    "font-bold transition-colors cursor-default",
                    isMostPlayed
                      ? "text-primary drop-shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  style={{ fontSize: `${size + 1}rem` }}
                  title={`${genre.play_count} plays`}
                >
                  {genre.genre}
                </div>
              );
            })
          ) : (
            <div className="text-muted-foreground">
              Play some music to define your vibe.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
