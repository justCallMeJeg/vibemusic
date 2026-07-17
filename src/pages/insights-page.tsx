import { useEffect, useRef, memo } from "react";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useStatsStore, type TimeRange } from "@/stores/stats-store";
import { useNavigationStore, useCurrentPage } from "@/stores/navigation-store";
import { useAudioStore, useIsPlayerVisible } from "@/stores/audio-store";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Clock, Music, Radio, Sparkles, BarChart2 } from "lucide-react";
import { ListItem } from "@/components/shared/list-item";
import { ListeningHeatmap } from "@/components/insights/listening-heatmap";
import { TrendIndicator } from "@/components/insights/trend-indicator";
import { ListeningStreaks } from "@/components/insights/listening-streaks";
import { WeeklyWrap } from "@/components/insights/weekly-wrap";
import { PageLayout } from "@/components/shared/page-layout";
import { EmptyState } from "@/components/shared/empty-state";

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  isLoading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: number;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-card/50 border border-border rounded-xl p-4 flex flex-col gap-2 animate-pulse">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-7 w-20" />
      </div>
    );
  }

  return (
    <div className="bg-card/50 border border-border rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group">
      <div className="flex items-center justify-between gap-2 text-muted-foreground z-10">
        <div className="flex items-center gap-2">
          <Icon size={16} />
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        {trend !== undefined && <TrendIndicator value={trend} />}
      </div>
      <div className="text-2xl font-bold text-foreground z-10">{value}</div>
      <Icon
        className="absolute -right-4 -bottom-4 text-muted-foreground/10 group-hover:text-primary/30 transition-all duration-500"
        size={64}
      />
    </div>
  );
}

function TopListSkeleton() {
  return (
    <div className="bg-card/30 border border-border/50 rounded-xl p-3 animate-pulse">
      <Skeleton className="h-4 w-20 mb-2" />
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 py-1">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-3/4 mb-1" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
            <Skeleton className="h-3 w-6 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeRangeSelector({
  value,
  onChange,
  disabled,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  disabled?: boolean;
}) {
  const ranges: { label: string; value: TimeRange }[] = [
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "6 Months", value: "6mo" },
    { label: "Year", value: "1y" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="flex bg-muted p-1 rounded-lg">
      {ranges.map((range) => (
        <button
          type="button"
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-all",
            disabled && "pointer-events-none",
            value === range.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

const ITEMS_VISIBLE = 5;

export default memo(function InsightsPage() {
  const { data, isLoading, fetchStats, timeRange, setTimeRange } =
    useStatsStore();
  const { openAlbumDetail, openArtistDetail } = useNavigationStore();
  const currentPage = useCurrentPage();
  const play = useAudioStore((s) => s.play);
  const isPlayerVisible = useIsPlayerVisible();
  const insightsScrollRef = useScrollMask();
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (currentPage === "insights") {
      fetchStats();
    }
  }, [currentPage, fetchStats]);

  if (data && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const showSkeleton = isLoading && !hasLoadedOnce.current;

  const totalPlays = data?.top_tracks.length
    ? data.top_tracks.reduce((sum, t) => sum + t.play_count, 0)
    : 0;

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const isEmpty =
    data && !showSkeleton
      ? data.total_listening_ms === 0 && data.top_tracks.length === 0
      : false;

  const rankedTracks = data?.top_tracks.slice(0, ITEMS_VISIBLE) ?? [];
  const rankedArtists = data?.top_artists.slice(0, ITEMS_VISIBLE) ?? [];
  const rankedAlbums = data?.top_albums.slice(0, ITEMS_VISIBLE) ?? [];

  return (
    <PageLayout overflowHidden>
      <div className="flex flex-col shrink-0">
        <PageHeader title="Insights">
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            disabled={isLoading}
          />
        </PageHeader>
      </div>

      <div
        ref={insightsScrollRef}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden scroll-mask-y",
          isPlayerVisible ? "pb-player-bar" : "pb-8",
        )}
      >
        {isEmpty ? (
          <div className="p-8">
            <EmptyState
              icon={BarChart2}
              title="No insights yet"
              description="Start listening to music to see your listening statistics and trends."
            />
          </div>
        ) : (
          <div className="space-y-6">
            <section className="px-4">
              <WeeklyWrap
                data={data?.weekly_wrap ?? { total_plays: 0, total_listening_ms: 0, unique_tracks: 0, unique_artists: 0, top_track: null, top_artist: null, most_active_day: null, most_active_day_plays: 0 }}
                timeRange={timeRange}
                isLoading={showSkeleton}
              />
            </section>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4">
              <StatCard
                icon={Clock}
                label="Listened"
                value={data ? formatTime(data.total_listening_ms) : "—"}
                trend={data?.trends.listening_time_change}
                isLoading={showSkeleton}
              />
              <StatCard
                icon={Music}
                label="Plays"
                value={totalPlays}
                trend={data?.trends.play_count_change}
                isLoading={showSkeleton}
              />
              <StatCard
                icon={Sparkles}
                label="New Discoveries"
                value={data?.trends.new_artists_count ?? "—"}
                isLoading={showSkeleton}
              />
              <StatCard
                icon={Radio}
                label="Top Genre"
                value={data?.top_genres[0]?.genre ?? "—"}
                isLoading={showSkeleton}
              />
            </div>

            <section className="px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListeningStreaks
                  data={data?.streaks ?? { current_streak: 0, longest_streak: 0, week_days: [] }}
                  isLoading={showSkeleton}
                />
                <ListeningHeatmap
                  data={data?.heatmap ?? []}
                  isLoading={showSkeleton}
                />
              </div>
            </section>

            <section className="space-y-3 px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {showSkeleton && !data ? (
                  <>
                    <TopListSkeleton />
                    <TopListSkeleton />
                    <TopListSkeleton />
                  </>
                ) : (
                  <>
                    <div className="bg-card/30 border border-border/50 rounded-xl p-3">
                      <h3 className="text-sm font-bold mb-2 px-1">Top Tracks</h3>
                      <div className="flex flex-col gap-0.5">
                        {showSkeleton
                          ? Array.from({ length: ITEMS_VISIBLE }).map((_, i) => (
                              <div key={i} className="flex items-center gap-2.5 py-1.5 px-1 animate-pulse">
                                <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <Skeleton className="h-3 w-3/4 mb-1" />
                                  <Skeleton className="h-2.5 w-1/2" />
                                </div>
                                <Skeleton className="h-3 w-6 shrink-0" />
                              </div>
                            ))
                          : rankedTracks.map((track, i) => (
                              <ListItem
                                key={track.id}
                                title={track.title}
                                subtitle={track.artist}
                                artworkSrc={track.cover_image ?? undefined}
                                index={i + 1}
                                trailing={<span className="tabular-nums text-xs">{track.play_count}</span>}
                                variant="compact"
                                showArtwork
                                onClick={() => {
                                  play({
                                    id: track.id,
                                    title: track.title,
                                    artist: track.artist,
                                    artwork_path: track.cover_image,
                                    duration_ms: track.duration_ms,
                                    file_path: track.file_path,
                                    album: "",
                                    album_id: null,
                                    artist_id: null,
                                    artist_ids: [],
                                    artist_names: [],
                                    track_number: null,
                                  });
                                }}
                              />
                            ))}
                        {!showSkeleton && rankedTracks.length === 0 && (
                          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                            No tracks played yet
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-card/30 border border-border/50 rounded-xl p-3">
                      <h3 className="text-sm font-bold mb-2 px-1">Top Artists</h3>
                      <div className="flex flex-col gap-0.5">
                        {showSkeleton
                          ? Array.from({ length: ITEMS_VISIBLE }).map((_, i) => (
                              <div key={i} className="flex items-center gap-2.5 py-1.5 px-1 animate-pulse">
                                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <Skeleton className="h-3 w-3/4 mb-1" />
                                  <Skeleton className="h-2.5 w-1/2" />
                                </div>
                                <Skeleton className="h-3 w-6 shrink-0" />
                              </div>
                            ))
                          : rankedArtists.map((artist, i) => (
                              <ListItem
                                key={artist.id}
                                title={artist.name}
                                subtitle={`${artist.play_count} plays`}
                                artworkSrc={artist.cover_image ?? undefined}
                                artworkCircular
                                placeholderType="artist"
                                index={i + 1}
                                variant="compact"
                                showArtwork
                                onClick={() => openArtistDetail(artist.id)}
                              />
                            ))}
                        {!showSkeleton && rankedArtists.length === 0 && (
                          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                            No artists played yet
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-card/30 border border-border/50 rounded-xl p-3">
                      <h3 className="text-sm font-bold mb-2 px-1">Top Albums</h3>
                      <div className="flex flex-col gap-0.5">
                        {showSkeleton
                          ? Array.from({ length: ITEMS_VISIBLE }).map((_, i) => (
                              <div key={i} className="flex items-center gap-2.5 py-1.5 px-1 animate-pulse">
                                <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <Skeleton className="h-3 w-3/4 mb-1" />
                                  <Skeleton className="h-2.5 w-1/2" />
                                </div>
                                <Skeleton className="h-3 w-6 shrink-0" />
                              </div>
                            ))
                          : rankedAlbums.map((album, i) => (
                              <ListItem
                                key={album.id}
                                title={album.title}
                                subtitle={album.artist}
                                artworkSrc={album.cover_image ?? undefined}
                                index={i + 1}
                                trailing={<span className="tabular-nums text-xs">{album.play_count}</span>}
                                variant="compact"
                                showArtwork
                                onClick={() => openAlbumDetail(album.id)}
                              />
                            ))}
                        {!showSkeleton && rankedAlbums.length === 0 && (
                          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                            No albums played yet
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </PageLayout>
  );
});
