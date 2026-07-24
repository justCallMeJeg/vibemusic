import { useEffect, useRef, memo, useCallback } from "react";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useStatsStore, type TimeRange } from "@/stores/stats-store";
import { useNavigationStore, useCurrentPage, useGoBack } from "@/stores/navigation-store";
import { useAudioStore, useIsPlayerVisible } from "@/stores/audio-store";
import { useKeybindsStore } from "@/stores/keybinds-store";
import { useInteractionStore } from "@/stores/interaction-store";
import { useSettingsStore } from "@/stores/settings-store";
import { RovingTabindexProvider } from "@/hooks/use-roving-tabindex";
import { getAlbumTracks, getArtistTracks } from "@/lib/api";
import { logger } from "@/lib/logger";
import { formatListeningTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Music, Radio, Sparkles, BarChart2 } from "lucide-react";
import { ListItem } from "@/components/shared/list-item";
import { ListeningHeatmap } from "@/components/insights/listening-heatmap";
import { TrendIndicator } from "@/components/insights/trend-indicator";
import { ListeningStreaks } from "@/components/insights/listening-streaks";
import { WeeklyWrap } from "@/components/insights/weekly-wrap";
import { RankedListCard } from "@/features/insights/components/ranked-list-card";
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
const SCOPE = "page:insights";

export default memo(function InsightsPage() {
  const { data, isLoading, fetchStats, timeRange, setTimeRange } =
    useStatsStore();
  const { openAlbumDetail, openArtistDetail } = useNavigationStore();
  const goBack = useGoBack();
  const currentPage = useCurrentPage();
  const play = useAudioStore((s) => s.play);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);
  const isPlayerVisible = useIsPlayerVisible();
  const insightsScrollRef = useScrollMask();
  const hasLoadedOnce = useRef(false);

  const tracksRef = useRef<HTMLDivElement>(null);
  const artistsRef = useRef<HTMLDivElement>(null);
  const albumsRef = useRef<HTMLDivElement>(null);
  const hasInteractedRef = useRef(false);

  const scrollItemIntoView = useCallback((container: HTMLElement | null, index: number) => {
    if (!container || !hasInteractedRef.current) return;
    const item = container.querySelector<HTMLElement>(`[data-item-index="${index}"]`);
    item?.scrollIntoView({ block: "center" });
  }, []);

  useEffect(() => {
    const { register, clearScope } = useKeybindsStore.getState();
    register("escape", {
      combo: { key: "Escape" },
      handler: () => goBack(),
      description: "Return to previous page",
      preventDefault: true,
    }, SCOPE);
    return () => clearScope(SCOPE);
  }, [goBack]);

  useEffect(() => {
    if (currentPage === "insights") {
      insightsScrollRef.current?.scrollTo(0, 0);
      fetchStats();
    }
  }, [currentPage, fetchStats, insightsScrollRef]);

  if (data && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  const showSkeleton = isLoading && !hasLoadedOnce.current;

  const totalPlays = data?.top_tracks.length
    ? data.top_tracks.reduce((sum, t) => sum + t.play_count, 0)
    : 0;

  const isEmpty =
    data && !showSkeleton
      ? data.total_listening_ms === 0 && data.top_tracks.length === 0
      : false;

  const rankedTracks = data?.top_tracks.slice(0, ITEMS_VISIBLE) ?? [];
  const rankedArtists = data?.top_artists.slice(0, ITEMS_VISIBLE) ?? [];
  const rankedAlbums = data?.top_albums.slice(0, ITEMS_VISIBLE) ?? [];

  // Cross-column arrow navigation: ←/→ between Tracks ↔ Artists ↔ Albums
  useEffect(() => {
    if (!useSettingsStore.getState().experimentalFeatures.keyboardNav) return;

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const active = document.activeElement;
      if (!active) return;

      if (e.key === "ArrowRight") {
        if (tracksRef.current?.contains(active)) {
          e.preventDefault();
          e.stopPropagation();
          hasInteractedRef.current = true;
          const first = artistsRef.current?.querySelector<HTMLElement>('[data-item-index="0"]');
          first?.focus({ preventScroll: true });
          first?.scrollIntoView({ block: "center" });
        } else if (artistsRef.current?.contains(active)) {
          e.preventDefault();
          e.stopPropagation();
          hasInteractedRef.current = true;
          const first = albumsRef.current?.querySelector<HTMLElement>('[data-item-index="0"]');
          first?.focus({ preventScroll: true });
          first?.scrollIntoView({ block: "center" });
        }
      } else {
        if (albumsRef.current?.contains(active)) {
          e.preventDefault();
          e.stopPropagation();
          hasInteractedRef.current = true;
          const last = rankedArtists.length - 1;
          const target = artistsRef.current?.querySelector<HTMLElement>(`[data-item-index="${last}"]`);
          target?.focus({ preventScroll: true });
          target?.scrollIntoView({ block: "center" });
        } else if (artistsRef.current?.contains(active)) {
          e.preventDefault();
          e.stopPropagation();
          hasInteractedRef.current = true;
          const last = rankedTracks.length - 1;
          const target = tracksRef.current?.querySelector<HTMLElement>(`[data-item-index="${last}"]`);
          target?.focus({ preventScroll: true });
          target?.scrollIntoView({ block: "center" });
        }
      }
    };

    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [rankedTracks.length, rankedArtists.length, rankedAlbums.length]);

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
          <div className="flex items-center justify-center h-full">
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
                value={data ? formatListeningTime(data.total_listening_ms) : "—"}
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
                    <RovingTabindexProvider
                      containerRef={tracksRef}
                      itemCount={rankedTracks.length}
                      enabled={rankedTracks.length > 0}
                      autoFocus={rankedTracks.length > 0 && useInteractionStore.getState().focusSource === "keyboard"}
                      direction="vertical"
                      onActivate={(idx: number) => {
                        const t = rankedTracks[idx];
                        if (t) {
                          play({
                            id: t.id, title: t.title, artist: t.artist,
                            artwork_path: t.cover_image, duration_ms: t.duration_ms,
                            file_path: t.file_path, album: "", album_id: null,
                            artist_id: null, artist_ids: [], artist_names: [],
                            artist_roles: [], track_number: null,
                          });
                        }
                      }}
                      onActivateSecondary={(idx: number) => {
                        const t = rankedTracks[idx];
                        if (t) {
                          playNext({
                            id: t.id, title: t.title, artist: t.artist,
                            artwork_path: t.cover_image, duration_ms: t.duration_ms,
                            file_path: t.file_path, album: "", album_id: null,
                            artist_id: null, artist_ids: [], artist_names: [],
                            artist_roles: [], track_number: null,
                          });
                        }
                      }}
                      onIndexChange={(idx: number) => { scrollItemIntoView(tracksRef.current, idx); hasInteractedRef.current = true; }}
                    >
                      <RankedListCard ref={tracksRef} title="Top Tracks" isLoading={showSkeleton && !data} hasData={rankedTracks.length > 0} emptyMessage="No tracks played yet">
                        {rankedTracks.map((track, i) => {
                            const trackObj = {
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
                              artist_roles: [],
                              track_number: null,
                            };
                            return (
                              <ListItem
                                key={track.id}
                                title={track.title}
                                subtitle={track.artist}
                                artworkSrc={track.cover_image ?? undefined}
                                index={i + 1}
                                dataItemIndex={i}
                                trailing={<span className="tabular-nums text-xs">{track.play_count}</span>}
                                variant="compact"
                                showArtwork
                                onClick={() => play(trackObj)}
                                menuActions={{
                                  onPlay: () => play(trackObj),
                                  onPlayNext: () => playNext(trackObj),
                                  onAddToQueue: () => addToQueue(trackObj),
                                }}
                              />
                            );
                          })}
                      </RankedListCard>
                    </RovingTabindexProvider>

                    <RovingTabindexProvider
                      containerRef={artistsRef}
                      itemCount={rankedArtists.length}
                      enabled={rankedArtists.length > 0}
                      direction="vertical"
                      onActivate={(idx: number) => {
                        const a = rankedArtists[idx];
                        if (a) openArtistDetail(a.id);
                      }}
                      onActivateSecondary={async (idx: number) => {
                        const a = rankedArtists[idx];
                        if (a) {
                          try {
                            const artistTracks = await getArtistTracks(a.id);
                            if (artistTracks.length > 0) {
                              play(artistTracks[0], artistTracks);
                            }
                          } catch (err) {
                            logger.error("Failed to play artist tracks", err);
                          }
                        }
                      }}
                      onIndexChange={(idx: number) => { scrollItemIntoView(artistsRef.current, idx); hasInteractedRef.current = true; }}
                    >
                      <RankedListCard ref={artistsRef} title="Top Artists" isLoading={showSkeleton && !data} hasData={rankedArtists.length > 0} emptyMessage="No artists played yet">
                        {rankedArtists.map((artist, i) => (
                          <ListItem
                            key={artist.id}
                            title={artist.name}
                            subtitle={`${artist.play_count} plays`}
                            artworkSrc={artist.cover_image ?? undefined}
                            artworkCircular
                            placeholderType="artist"
                            index={i + 1}
                            dataItemIndex={i}
                            variant="compact"
                            showArtwork
                            onClick={() => openArtistDetail(artist.id)}
                            menuActions={{
                              onPlay: async () => {
                                try {
                                  const artistTracks = await getArtistTracks(artist.id);
                                  if (artistTracks.length > 0) {
                                    play(artistTracks[0], artistTracks);
                                  }
                                } catch (err) {
                                  logger.error("Failed to play artist tracks", err);
                                }
                              },
                              onGoToArtist: () => openArtistDetail(artist.id),
                            }}
                          />
                        ))}
                      </RankedListCard>
                    </RovingTabindexProvider>

                    <RovingTabindexProvider
                      containerRef={albumsRef}
                      itemCount={rankedAlbums.length}
                      enabled={rankedAlbums.length > 0}
                      direction="vertical"
                      onActivate={(idx: number) => {
                        const a = rankedAlbums[idx];
                        if (a) openAlbumDetail(a.id);
                      }}
                      onActivateSecondary={async (idx: number) => {
                        const a = rankedAlbums[idx];
                        if (a) {
                          try {
                            const albumTracks = await getAlbumTracks(a.id);
                            if (albumTracks.length > 0) {
                              const sorted = albumTracks.sort(
                                (a, b) => (a.track_number || 0) - (b.track_number || 0),
                              );
                              play(sorted[0], sorted);
                            }
                          } catch (err) {
                            logger.error("Failed to play album", err);
                          }
                        }
                      }}
                      onIndexChange={(idx: number) => { scrollItemIntoView(albumsRef.current, idx); hasInteractedRef.current = true; }}
                    >
                      <RankedListCard ref={albumsRef} title="Top Albums" isLoading={showSkeleton && !data} hasData={rankedAlbums.length > 0} emptyMessage="No albums played yet">
                        {rankedAlbums.map((album, i) => {
                            const handlePlayAlbum = async () => {
                              try {
                                const albumTracks = await getAlbumTracks(album.id);
                                if (albumTracks.length > 0) {
                                  const sorted = albumTracks.sort(
                                    (a, b) => (a.track_number || 0) - (b.track_number || 0),
                                  );
                                  play(sorted[0], sorted);
                                }
                              } catch (err) {
                                logger.error("Failed to play album", err);
                              }
                            };
                            const handleShuffleAlbum = async () => {
                              try {
                                const albumTracks = await getAlbumTracks(album.id);
                                if (albumTracks.length > 0) {
                                  const shuffled = [...albumTracks].sort(() => Math.random() - 0.5);
                                  play(shuffled[0], shuffled);
                                }
                              } catch (err) {
                                logger.error("Failed to shuffle album", err);
                              }
                            };
                            return (
                              <ListItem
                                key={album.id}
                                title={album.title}
                                subtitle={album.artist}
                                artworkSrc={album.cover_image ?? undefined}
                                index={i + 1}
                                dataItemIndex={i}
                                trailing={<span className="tabular-nums text-xs">{album.play_count}</span>}
                                variant="compact"
                                showArtwork
                                onClick={() => openAlbumDetail(album.id)}
                                menuActions={{
                                  onPlay: handlePlayAlbum,
                                  onShuffle: handleShuffleAlbum,
                                  onGoToAlbum: () => openAlbumDetail(album.id),
                                }}
                              />
                            );
                          })}
                      </RankedListCard>
                    </RovingTabindexProvider>
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
