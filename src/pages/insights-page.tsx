import { useEffect } from "react";
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
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: number;
}) {
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

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
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

export default function InsightsPage() {
  const { data, fetchStats, timeRange, setTimeRange } =
    useStatsStore();
  const { openAlbumDetail, openArtistDetail } = useNavigationStore();
  const currentPage = useCurrentPage();
  const play = useAudioStore((s) => s.play);
  const isPlayerVisible = useIsPlayerVisible();
  const insightsScrollRef = useScrollMask();

  useEffect(() => {
    if (currentPage === "insights") {
      fetchStats();
    }
  }, [currentPage, fetchStats]);

  const totalPlays = data?.top_tracks.length
    ? data.top_tracks.reduce((sum, t) => sum + t.play_count, 0)
    : 0;

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  if (!data) {
    return (
      <PageLayout overflowHidden className={cn("p-8 space-y-6 animate-pulse", isPlayerVisible ? "pb-player-bar" : "pb-8")}>
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  const isEmpty =
    data.total_listening_ms === 0 && data.top_tracks.length === 0;

  if (isEmpty) {
    return (
      <PageLayout overflowHidden className={cn(isPlayerVisible ? "pb-player-bar" : "pb-8")}>
        <div className="flex flex-col shrink-0">
          <PageHeader title="Insights" />
        </div>
        <EmptyState
          icon={BarChart2}
          title="No insights yet"
          description="Start listening to music to see your listening statistics and trends."
        />
      </PageLayout>
    );
  }

  const rankedTracks = data.top_tracks.slice(0, ITEMS_VISIBLE);
  const rankedArtists = data.top_artists.slice(0, ITEMS_VISIBLE);
  const rankedAlbums = data.top_albums.slice(0, ITEMS_VISIBLE);

  return (
    <PageLayout overflowHidden>
      <div className="flex flex-col shrink-0">
        <PageHeader title="Insights">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </PageHeader>
      </div>

      <div
        ref={insightsScrollRef}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden space-y-6 scroll-mask-y",
          isPlayerVisible ? "pb-player-bar" : "pb-8",
        )}
      >
        {/* Overview (replaces stat cards — dynamic based on timeRange) */}
        <section className="px-4">
          <WeeklyWrap data={data.weekly_wrap} timeRange={timeRange} />
        </section>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4">
          <StatCard
            icon={Clock}
            label="Listened"
            value={formatTime(data.total_listening_ms)}
            trend={data.trends.listening_time_change}
          />
          <StatCard
            icon={Music}
            label="Plays"
            value={totalPlays}
            trend={data.trends.play_count_change}
          />
          <StatCard
            icon={Sparkles}
            label="New Discoveries"
            value={data.trends.new_artists_count}
          />
          <StatCard
            icon={Radio}
            label="Top Genre"
            value={data.top_genres[0]?.genre ?? "—"}
          />
        </div>

        {/* Streak Calendar + Listening Habits — 2-column row */}
        <section className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListeningStreaks data={data.streaks} />
            <ListeningHeatmap data={data.heatmap} />
          </div>
        </section>

        {/* 3-Column Top Lists */}
        <section className="space-y-3 px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Tracks */}
            <div className="bg-card/30 border border-border/50 rounded-xl p-3">
              <h3 className="text-sm font-bold mb-2 px-1">Top Tracks</h3>
              <div className="flex flex-col gap-0.5">
                {rankedTracks.map((track, i) => (
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
                        file_path: "",
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
                {rankedTracks.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                    No tracks played yet
                  </div>
                )}
              </div>
            </div>

            {/* Top Artists */}
            <div className="bg-card/30 border border-border/50 rounded-xl p-3">
              <h3 className="text-sm font-bold mb-2 px-1">Top Artists</h3>
              <div className="flex flex-col gap-0.5">
                {rankedArtists.map((artist, i) => (
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
                {rankedArtists.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                    No artists played yet
                  </div>
                )}
              </div>
            </div>

            {/* Top Albums */}
            <div className="bg-card/30 border border-border/50 rounded-xl p-3">
              <h3 className="text-sm font-bold mb-2 px-1">Top Albums</h3>
              <div className="flex flex-col gap-0.5">
                {rankedAlbums.map((album, i) => (
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
                {rankedAlbums.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                    No albums played yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
      </PageLayout>
    );
}
