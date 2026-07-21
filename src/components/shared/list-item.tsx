import { memo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { ScrollingText } from "@/components/shared/scrolling-text";
import { Play, Pause } from "lucide-react";
import { UnifiedContextMenu } from "@/components/shared/unified-context-menu";
import { useTrackContextMenu } from "@/hooks/use-track-context-menu";
import type { TrackMenuActions } from "@/components/shared/context-menu-types";

const rowVariants = cva(
  "mx-0.5 group flex items-center gap-3 rounded-md p-2 transition-colors cursor-default select-none relative debug-list-item",
  {
    variants: {
      variant: {
        default: "hover:bg-accent/10",
        indexed: "hover:bg-accent/10",
        compact: "hover:bg-accent/10",
        detailed: "hover:bg-accent/10 p-2",
      },
      active: {
        true: "bg-accent/20 text-accent-foreground outline outline-1 outline-border",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      active: false,
    },
  },
);

interface ListItemProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onClick">,
    VariantProps<typeof rowVariants> {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  artworkSrc?: string;
  index?: number;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  showArtwork?: boolean;
  isPlaying?: boolean;
  artworkCircular?: boolean;

  placeholderType?: "artist" | "track";
  onClick?: () => void;
  menuActions?: TrackMenuActions;

  /**
   * Index within the parent list for arrow-key sibling navigation.
   */
  dataItemIndex?: number;
}

export const ListItem = memo(function ListItem({
  title,
  subtitle,
  artworkSrc,
  index,
  leading,
  trailing,
  variant,
  active,
  className,
  showArtwork = true,
  isPlaying = false,
  artworkCircular,

  placeholderType,
  onClick,
  menuActions,
  dataItemIndex,
  ...props
}: ListItemProps) {
  const row = (
    <div
      className={cn(
        rowVariants({ variant, active }),
        onClick && "cursor-pointer",
        className,
      )}
      data-active={active}
      data-item-index={dataItemIndex}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      {...props}
    >
      {variant === "indexed" && (
        <div className="w-8 flex justify-center shrink-0 text-muted-foreground text-sm font-variant-numeric tabular-nums">
          {!active ? (
            <>
              <span className="group-hover:hidden">
                {leading ?? index ?? null}
              </span>
              <span
                aria-label="Play"
                className="hidden group-hover:block text-foreground"
              >
                <Play size={16} fill="currentColor" />
              </span>
            </>
          ) : (
            <>
              <span
                className={cn(
                  "group-hover:hidden",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Pause size={16} fill="currentColor" />
              </span>
              <span
                aria-label={active && isPlaying ? "Pause" : "Play"}
                className="hidden group-hover:block text-foreground"
              >
                {active && isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
              </span>
            </>
          )}
        </div>
      )}

      {showArtwork && (
        <div
          className={cn(
            "relative shrink-0",
            variant !== "indexed" && "w-10 h-10",
          )}
        >
          <ArtworkImage
            src={artworkSrc}
            alt={typeof title === "string" ? title : "Artwork"}
            placeholderType={placeholderType || "track"}
            className={cn(
              "w-10 h-10 object-cover bg-secondary",
              artworkCircular ? "rounded-full" : "rounded shadow-sm",
            )}
          />
          {variant !== "indexed" && (onClick || active) && (
            <div
              className={cn(
                "absolute inset-0 bg-black/40 flex items-center justify-center rounded transition-opacity",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              {isPlaying ? (
                <Pause size={16} className="fill-white text-white" />
              ) : (
                <Play size={16} className="fill-white text-white" />
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div
          className={cn(
            "text-sm font-medium truncate",
            active && "text-primary font-bold",
            "w-full",
          )}
        >
          {typeof title === "string" ? (
            <ScrollingText>{title}</ScrollingText>
          ) : (
            title
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {subtitle}
          </div>
        )}
      </div>

      {trailing && (
        <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-sm">
          {trailing}
        </div>
      )}
    </div>
  );

  const menuItems = useTrackContextMenu({
    onPlay: menuActions?.onPlay,
    onPause: menuActions?.onPause,
    onShuffle: menuActions?.onShuffle,
    onPlayNext: menuActions?.onPlayNext,
    onAddToQueue: menuActions?.onAddToQueue,
    onAddToPlaylist: menuActions?.onAddToPlaylist,
    onEdit: menuActions?.onEdit,
    onDelete: menuActions?.onDelete,
    playlists: menuActions?.playlists,
  });

  if (menuItems.length > 0) {
    return (
      <UnifiedContextMenu items={menuItems}>{row}</UnifiedContextMenu>
    );
  }

  return row;
});
