import { memo } from "react";
import { useNavigationStore } from "@/stores/navigation-store";
import { cn } from "@/lib/utils";

interface ArtistLinksProps {
  names?: string[] | null;
  ids?: number[] | null;
  roles?: string[] | null;
  className?: string;
  fallbackName?: string | null;
  fallbackId?: number | null;
}

export const ArtistLinks = memo(function ArtistLinks({
  names,
  ids,
  roles,
  className,
  fallbackName,
  fallbackId,
}: ArtistLinksProps) {
  const openArtistDetail = useNavigationStore((s) => s.openArtistDetail);

  const handleArtistClick = (e: React.MouseEvent, id: number, name?: string) => {
    e.stopPropagation();
    openArtistDetail(id, name);
  };

  if (names && ids && names.length > 0 && names.length === ids.length) {
    const hasRoles = roles && roles.length === names.length;
    return (
      <span className={cn("truncate", className)} title={names.join(", ")}>
        {names.map((name, index) => {
          const role = hasRoles ? roles[index] : "main";
          const isFeatured = role === "featured";
          return (
            <span key={ids[index]}>
              {isFeatured && index > 0 && (
                <span className="text-muted-foreground">{" feat. "}</span>
              )}
              <button
                type="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleArtistClick(
                      e as unknown as React.MouseEvent,
                      ids[index],
                    );
                }}
                onClick={(e) =>
                  handleArtistClick(e, ids[index], names[index])
                }
                className={cn(
                  "hover:underline cursor-pointer transition-colors",
                  isFeatured && "text-muted-foreground"
                )}
              >
                {name}
              </button>
              {!isFeatured && index < names.length - 1 && ", "}
            </span>
          );
        })}
      </span>
    );
  }

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
          if (fallbackId)
            handleArtistClick(e, fallbackId, fallbackName || undefined);
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
});
