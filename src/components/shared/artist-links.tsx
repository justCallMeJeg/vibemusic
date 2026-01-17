import { useNavigationStore } from "@/stores/navigation-store";
import { cn } from "@/lib/utils";

interface ArtistLinksProps {
  names?: string[] | null;
  ids?: number[] | null;
  className?: string;
  // Fallback for single artist
  fallbackName?: string | null;
  fallbackId?: number | null;
}

export function ArtistLinks({
  names,
  ids,
  className,
  fallbackName,
  fallbackId,
}: ArtistLinksProps) {
  const openArtistDetail = useNavigationStore((s) => s.openArtistDetail);

  const handleArtistClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent row click
    openArtistDetail(id);
  };

  if (names && ids && names.length > 0 && names.length === ids.length) {
    return (
      <span className={cn("truncate", className)} title={names.join(", ")}>
        {names.map((name, index) => (
          <span key={ids[index]}>
            <span
              onClick={(e) => handleArtistClick(e, ids[index])}
              className="hover:underline cursor-pointer hover:text-white transition-colors"
            >
              {name}
            </span>
            {index < names.length - 1 && ", "}
          </span>
        ))}
      </span>
    );
  }

  // Fallback if no array data (shouldn't happen with new backend)
  if (fallbackName) {
    return (
      <span
        className={cn(
          "truncate hover:underline cursor-pointer hover:text-white transition-colors",
          className
        )}
        onClick={(e) => {
          if (fallbackId) handleArtistClick(e, fallbackId);
        }}
      >
        {fallbackName}
      </span>
    );
  }

  return (
    <span className={cn("text-muted-foreground", className)}>
      Unknown Artist
    </span>
  );
}
