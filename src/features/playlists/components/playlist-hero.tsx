import { useState, type ReactNode } from "react";
import { Play, Shuffle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { DynamicPlaceholder } from "@/components/shared/dynamic-placeholder";
import { formatDuration } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface PlaylistHeroProps {
  coverUrl?: string;
  title: string;
  description?: string;
  trackCount: number;
  totalDurationMs: number;
  lastModified: string;
  onEdit: () => void;
  onDelete: () => void;
  onPlayAll: () => void;
  onShuffle: () => void;
  className?: string;
  children?: ReactNode;
}

export function PlaylistHero({
  coverUrl,
  title,
  description,
  trackCount,
  totalDurationMs,
  lastModified,
  onEdit,
  onDelete,
  onPlayAll,
  onShuffle,
  className,
  children,
}: PlaylistHeroProps) {
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const showImage = !!coverUrl && failedCoverUrl !== coverUrl;

  return (
    <div className={cn("flex gap-6 mb-6 px-2", className)}>
      <div className="w-40 h-40 rounded-lg shrink-0 overflow-hidden shadow-xl">
        {showImage ? (
          <ArtworkImage
            src={coverUrl}
            alt={title}
            placeholderType="playlist"
            className="w-full h-full object-cover"
            onError={() => setFailedCoverUrl(coverUrl ?? null)}
          />
        ) : (
          <DynamicPlaceholder type="playlist" title={title} />
        )}
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <h2 className="text-4xl font-bold text-foreground line-clamp-2 mb-2">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">
          {description || "No description"}
        </p>
        <div className="text-muted-foreground text-sm flex gap-2 items-center mt-2">
          <span>{trackCount} songs</span>
          <span>•</span>
          <span>{formatDuration(totalDurationMs)}</span>
          <span>•</span>
          <span>
            Created {formatDistanceToNow(new Date(lastModified), { addSuffix: true })}
          </span>
        </div>
        <div className="flex gap-2 mt-6">
          <Button
            variant="default"
            size="lg"
            onClick={onPlayAll}
            disabled={trackCount === 0}
            className="gap-2 rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Play size={20} fill="currentColor" />
            Play
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onShuffle}
            disabled={trackCount === 0}
            className="gap-2 rounded-full"
          >
            <Shuffle size={20} />
            Shuffle
          </Button>
          {children}
          <Button
            variant="outline"
            size="icon-lg"
            onClick={onEdit}
            title="Edit Playlist"
          >
            <Pencil size={20} />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            className="text-destructive hover:text-destructive hover:border-destructive/50"
            title="Delete Playlist"
            onClick={onDelete}
          >
            <Trash2 size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
