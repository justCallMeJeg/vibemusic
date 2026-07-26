import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import {
  getPlaylistTracks,
  deletePlaylist,
  removeTrackFromPlaylist,
  Track,
  getPlaylists,
  Playlist,
} from "@/lib/api";
import { useNavigationStore, useDetailView } from "@/stores/navigation-store";
import { useAudioStore, useCurrentTrack } from "@/stores/audio-store";
import { useTrackActivationHandlers } from "@/hooks/use-track-activation-handlers";
import { useInteractionStore } from "@/stores/interaction-store";
import { SearchX, Plus, Music, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { formatDuration } from "@/lib/format";
import { usePlaylistStore } from "@features/playlists/store/playlist-store";
import { EmptyState } from "@/components/shared/empty-state";
import { ListItem } from "@/components/shared/list-item";
import { ArtistLinks } from "@/components/shared/artist-links";
import { arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DetailPageTemplate } from "@/components/shared/templates/detail-page-template";
import { TrackList } from "@/components/shared/templates/track-list";
import { PlaylistHero } from "@features/playlists/components/playlist-hero";
import { PlaylistDialogs } from "@features/playlists/components/playlist-dialogs";
import { usePlaylistPageKeybinds } from "@/hooks/use-playlist-page-keybinds";
import { useSelectionStore } from "@/stores/selection-store";

interface PlaylistTrackRowProps {
  track: Track;
  index: number;
  dataItemIndex?: number;
  removeTrack: (trackId: number, e: React.MouseEvent) => void;
  checkboxMode?: boolean;
}

const PlaylistTrackRow = memo(function PlaylistTrackRow({
  track,
  index,
  dataItemIndex,
  removeTrack,
  checkboxMode: checkboxModeProp,
}: PlaylistTrackRowProps) {
  const currentTrack = useCurrentTrack();
  const play = useAudioStore((s) => s.play);
  const pause = useAudioStore((s) => s.pause);
  const addToQueue = useAudioStore((s) => s.addToQueue);
  const playNext = useAudioStore((s) => s.playNext);
  const openAlbumDetail = useNavigationStore((s) => s.openAlbumDetail);
  const openArtistDetail = useNavigationStore((s) => s.openArtistDetail);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const isCurrentTrack = currentTrack?.id === track.id;

  const isSelected = useSelectionStore((s) => s.selectedIds.includes(track.id));

  const handleCheckToggle = useCallback(
    () => useSelectionStore.getState().toggle(track.id, dataItemIndex ?? 0),
    [track.id, dataItemIndex],
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => removeTrack(track.id, e),
    [removeTrack, track.id],
  );

  const handleClick = useCallback(() => {
    if (isCurrentTrack) {
      pause();
    } else {
      play(track);
    }
  }, [isCurrentTrack, pause, play, track]);

  const subtitle = useMemo(() => (
    <ArtistLinks
      names={track.artist_names}
      ids={track.artist_ids}
      roles={track.artist_roles}
      fallbackName={track.artist}
      fallbackId={track.artist_id}
    />
  ), [track.artist_names, track.artist_ids, track.artist_roles, track.artist, track.artist_id]);

  const trailing = useMemo(() => (
    <div className="flex items-center gap-3">
      <span className="tabular-nums text-xs">{formatDuration(track.duration_ms)}</span>
      {!checkboxModeProp && (
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        title="Remove from playlist"
      >
        <Trash2 size={16} />
      </Button>
      )}
    </div>
  ), [track.duration_ms, handleRemove, checkboxModeProp]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : "none",
    zIndex: isDragging ? 50 : "auto",
    position: "relative" as const,
  };

  const menuActions = useMemo(() => ({
    onPlay: () => play(track),
    onPause: isCurrentTrack ? () => pause() : undefined,
    onPlayNext: () => playNext(track),
    onAddToQueue: () => addToQueue(track),
    onGoToAlbum: track.album_id != null ? () => openAlbumDetail(track.album_id!) : undefined,
    onGoToArtist:
      track.artist_ids?.[0] || track.artist_id
        ? () => openArtistDetail(track.artist_ids?.[0] ?? track.artist_id!)
        : undefined,
    onCopyTitle: () => navigator.clipboard.writeText(track.title),
    onCopyArtist: () => navigator.clipboard.writeText(track.artist ?? ""),
    onCopyFilePath: track.file_path ? () => navigator.clipboard.writeText(track.file_path) : undefined,
  }), [track, isCurrentTrack, play, pause, playNext, addToQueue, openAlbumDetail, openArtistDetail]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 hover:bg-accent/50 rounded-md pr-2 ${
        isDragging ? "bg-accent shadow-xl" : ""
      } ${
        isCurrentTrack && !isDragging
          ? "bg-accent/50 outline outline-border"
          : ""
      }`}
    >
      {checkboxModeProp ? (
        <div className="w-12 flex justify-center shrink-0" data-checkbox-column="true">
          <Checkbox checked={isSelected} onCheckedChange={handleCheckToggle} />
        </div>
      ) : (
        <div
          className="w-12 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground group-hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <span className="text-sm font-variant-numeric tabular-nums group-hover:hidden">
            {index + 1}
          </span>
          <GripVertical size={16} className="hidden group-hover:block" />
        </div>
      )}
      <div className="flex-1 min-w-0">
      <ListItem
        title={track.title}
        subtitle={subtitle}
        artworkSrc={track.artwork_path || undefined}
        showArtwork
        active={isCurrentTrack}
        isPlaying={isCurrentTrack}
        trailing={trailing}
        onClick={handleClick}
        menuActions={menuActions}
        dataItemIndex={dataItemIndex}
        itemId={track.id}
        checkboxMode={checkboxModeProp}
        hideCheckboxColumn={checkboxModeProp}
        selectable
      />
      </div>
    </div>
  );
});

export default memo(function PlaylistDetailPage() {
  const detailView = useDetailView();
  const goBack = useNavigationStore((s) => s.goBack);
  const updateBreadcrumbLabel = useNavigationStore(
    (s) => s.updateBreadcrumbLabel,
  );
  const play = useAudioStore((s) => s.play);
  const reorderPlaylist = usePlaylistStore((s) => s.reorderPlaylist);
  const refreshPlaylists = usePlaylistStore((s) => s.refreshPlaylists);
  const checkboxMode = useSelectionStore((s) => s.mode === "checkbox");
  const [playlist, setPlaylist] = useState<Playlist | null>(() => {
    const id = detailView?.type === "playlist" ? detailView.id : null;
    if (!id) return null;
    return (
      usePlaylistStore.getState().playlists.find((p) => p.id === id) ?? null
    );
  });
  const [tracks, setTracks] = useState<Track[]>([]);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const playlistId = detailView?.type === "playlist" ? detailView.id : null;

  usePlaylistPageKeybinds(goBack);

  const loadData = useCallback(async () => {
    if (!playlistId) return;
    setIsLoading(true);
    try {
      const [allPlaylists, tracksData] = await Promise.all([
        getPlaylists(),
        getPlaylistTracks(playlistId),
      ]);

      const found = allPlaylists.find((p) => p.id === playlistId);
      if (found) {
        setPlaylist(found);
        updateBreadcrumbLabel("playlist", playlistId, found.name);
      }
      setTracks(tracksData);
    } catch (error) {
      logger.error("Failed to load playlist", error);
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, updateBreadcrumbLabel]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isLoading && tracks.length > 0 && useInteractionStore.getState().focusSource === "keyboard") {
      requestAnimationFrame(() => {
        const firstItem = document.querySelector<HTMLElement>(
          '[data-item-index="0"]',
        );
        if (firstItem && document.activeElement !== firstItem) {
          firstItem.focus();
        }
      });
    }
  }, [isLoading, tracks.length]);

  useEffect(() => {
    useSelectionStore.getState().setItems(
      tracks.map((t, i) => ({ id: t.id, index: i })),
    );
  }, [tracks]);

  const handlePlay = () => {
    if (tracks.length > 0) {
      play(tracks[0], tracks);
    }
  };

  const handleShuffle = useCallback(() => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      play(shuffled[0], shuffled);
    }
  }, [tracks, play]);

  const handleDelete = async () => {
    if (!playlistId) return;
    setIsDeleting(true);
    try {
      await deletePlaylist(playlistId);
      toast.success("Playlist deleted");
      await refreshPlaylists();
      goBack();
    } catch (e) {
      logger.error("Failed to delete playlist", e);
      toast.error("Failed to delete playlist");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleRemoveTrack = useCallback(
    async (trackId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!playlistId) return;

      try {
        await removeTrackFromPlaylist(playlistId, trackId);
        toast.success("Track removed");
        const newTracks = tracksRef.current.filter((t) => t.id !== trackId);
        setTracks(newTracks);
      } catch (e) {
        logger.error("Failed to remove track", e);
        toast.error("Failed to remove track");
      }
    },
    [playlistId],
  );

  const totalDurationMs = useMemo(
    () => tracks.reduce((acc, t) => acc + t.duration_ms, 0),
    [tracks],
  );
  const existingTrackIds = useMemo(
    () => new Set(tracks.map((t) => t.id)),
    [tracks],
  );

  const handleReorder = useCallback(
    async (activeId: string | number, overId: string | number) => {
      const oldIdx = tracks.findIndex((t) => t.id === activeId);
      const newIdx = tracks.findIndex((t) => t.id === overId);
      if (oldIdx === -1 || newIdx === -1) return;
      const newOrder = arrayMove(tracks, oldIdx, newIdx);
      setTracks(newOrder);
      const trackIds = newOrder.map((t) => t.id);
      if (playlistId) {
        try {
          await reorderPlaylist(playlistId, trackIds);
        } catch {
          loadData();
        }
      }
    },
    [tracks, playlistId, reorderPlaylist, loadData],
  );

  const handleRenderItem = useCallback(
    (track: Track, index: number) => (
      <PlaylistTrackRow
        key={track.id}
        track={track}
        index={index}
        dataItemIndex={index}
        checkboxMode={checkboxMode}
        removeTrack={handleRemoveTrack}
      />
    ),
    [handleRemoveTrack, checkboxMode],
  );

  const activationHandlers = useTrackActivationHandlers(tracks);

  if (!playlist && !isLoading) {
    return (
      <EmptyState
        icon={SearchX}
        title="Playlist not found"
        description="The playlist you're looking for doesn't exist or has been removed."
        action={
          <Button variant="ghost" onClick={goBack}>
            Go back
          </Button>
        }
      />
    );
  }

  return (
    <>
    <DetailPageTemplate
      title={playlist?.name ?? ""}
      subtitle={playlist ? `${tracks.length} songs` : undefined}
      artworkPath={playlist?.artwork_path ?? undefined}
      onBack={goBack}
      onPlay={tracks.length > 0 ? handlePlay : undefined}
    >
      <TrackList
        tracks={tracks}
        sortable={!checkboxMode}
        getItemId={(item: Track) => item.id}
        onReorder={handleReorder}
        renderItem={handleRenderItem}
        {...activationHandlers}
        trackListHeaderProps={{
          showDuration: true,
          indexWidth: "w-8",
          className: "gap-4 px-2",
        }}
        headerContent={
          <PlaylistHero
            coverUrl={playlist?.artwork_path ?? undefined}
            title={playlist?.name ?? ""}
            description={playlist?.description ?? undefined}
            trackCount={tracks.length}
            totalDurationMs={totalDurationMs}
            lastModified={playlist?.created_at ?? ""}
            onEdit={() => setIsEditOpen(true)}
            onDelete={() => setIsDeleteDialogOpen(true)}
            onPlayAll={handlePlay}
            onShuffle={handleShuffle}
          >
            <Button
              variant="outline"
              size="lg"
              className="gap-2 rounded-full"
              onClick={() => setIsAddSongOpen(true)}
            >
              <Plus size={20} />
              Add Songs
            </Button>
          </PlaylistHero>
        }
        headerExtras={
          <PlaylistDialogs
            isDeleteDialogOpen={isDeleteDialogOpen}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
            isEditOpen={isEditOpen}
            setIsEditOpen={setIsEditOpen}
            isAddSongOpen={isAddSongOpen}
            setIsAddSongOpen={setIsAddSongOpen}
            isDeleting={isDeleting}
            playlist={playlist}
            playlistId={playlistId}
            existingTrackIds={existingTrackIds}
            handleDelete={handleDelete}
            loadData={loadData}
          />
        }
        emptyState={
          !isLoading ? (
            <EmptyState
              icon={Music}
              title="This playlist is empty"
              description="Add songs from your library to build this playlist."
              action={
                <Button
                  variant="outline"
                  onClick={() => setIsAddSongOpen(true)}
                >
                  Add Songs
                </Button>
              }
            />
          ) : null
        }
      />
    </DetailPageTemplate>
    </>
  );
});
