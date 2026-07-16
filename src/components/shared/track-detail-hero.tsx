import { cn } from "@/lib/utils";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { ArtistLinks } from "@/components/shared/artist-links";

interface TrackDetailHeroProps {
  title: string;
  artistNames?: string[];
  artistIds?: number[];
  fallbackArtist?: string | null;
  fallbackArtistId?: number | null;
  artworkPath?: string | null;
  className?: string;
}

export function TrackDetailHero({
  title,
  artistNames,
  artistIds,
  fallbackArtist,
  fallbackArtistId,
  artworkPath,
  className,
}: TrackDetailHeroProps) {
  return (
    <div
      className={cn("flex flex-col items-center text-center mb-6", className)}
    >
      <ArtworkImage
        src={artworkPath}
        alt={title}
        placeholderType="track"
        className="w-40 h-40 rounded-lg shadow-md mb-4"
      />

      <div className="w-full px-2">
        <h2 className="text-xl font-bold text-foreground wrap-break-word leading-tight mb-1">
          {title}
        </h2>
        <div className="text-lg font-medium text-muted-foreground wrap-break-word">
          <ArtistLinks
            names={artistNames ?? []}
            ids={artistIds ?? []}
            fallbackName={fallbackArtist}
            fallbackId={fallbackArtistId}
            className="justify-center whitespace-normal"
          />
        </div>
      </div>
    </div>
  );
}
