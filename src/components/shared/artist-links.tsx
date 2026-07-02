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

  const handleArtistClick = (e: React.MouseEvent, id: number, name?: string) => {
    e.stopPropagation(); // Prevent row click
    openArtistDetail(id, name);
  };

  if (names && ids && names.length > 0 && names.length === ids.length) {
    return (
      <span className={cn("truncate", className)} title={names.join(", ")}>
        {names.map((name, index) => (
          <span key={ids[index]}>
            <button
              type="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  handleArtistClick(
                    e as unknown as React.MouseEvent,
                    ids[index],
                  );
              }}
              onClick={(e) => handleArtistClick(e, ids[index], names[index])}
              className="hover:underline cursor-pointer transition-colors"
            >
              {name}
            </button>
            {index < names.length - 1 && ", "}
          </span>
        ))}
      </span>
    );
  }

  // Fallback if no array data (shouldn't happen with new backend)
  if (fallbackName) {
    return (
      <button
        type="button"
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && fallbackId)
            handleArtistClick(e as unknown as React.MouseEvent, fallbackId);
        }}
        className={cn(
          "truncate hover:underline cursor-pointer hover:text-white transition-colors",
          className,
        )}
        onClick={(e) => {
          if (fallbackId) handleArtistClick(e, fallbackId, fallbackName || undefined);
        }}
      >
        {fallbackName}
      </button>
    );
  }

  return (
    <span className={cn("text-muted-foreground", className)}>
      Unknown Artist
    </span>
  );
}
