import { memo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { ScrollingText } from "@/components/shared/scrolling-text";
import { Play, Pause } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { ListPlus, Shuffle, Pencil, Trash2 } from "lucide-react";

const rowVariants = cva(
  "group flex items-center gap-3 rounded-md p-2 transition-colors cursor-default select-none relative debug-list-item",
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
  artworkFallback?: string;
  onClick?: () => void;
  menuActions?: {
    onPlay?: () => void;
    onPause?: () => void;
    onShuffle?: () => void;
    onPlayNext?: () => void;
    onAddToQueue?: () => void;
    onAddToPlaylist?: (playlistId: number) => void;
    onEdit?: () => void;
    onDelete?: () => void;
    playlists?: { id: number; name: string }[];
  };
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
  artworkFallback,
  onClick,
  menuActions,
  ...props
}: ListItemProps) {
  const showContextMenu =
    menuActions &&
    (menuActions.onPlay ||
      menuActions.onPause ||
      menuActions.onShuffle ||
      menuActions.onPlayNext ||
      menuActions.onAddToQueue ||
      menuActions.onAddToPlaylist ||
      menuActions.onEdit ||
      menuActions.onDelete);

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  const row = (
    <div
      className={cn(
        rowVariants({ variant, active }),
        onClick && "cursor-pointer",
        className,
      )}
      data-active={active}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
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
            fallback={artworkFallback}
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

  if (showContextMenu) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
        <ContextMenuContent>
          {(menuActions?.onPlay || menuActions?.onPause) && (
            <ContextMenuItem
              onSelect={menuActions.onPlay || menuActions.onPause}
            >
              <Play className="mr-2 h-4 w-4" />
              {menuActions.onPause ? "Pause" : "Play"}
            </ContextMenuItem>
          )}
          {menuActions?.onShuffle && (
            <ContextMenuItem onSelect={menuActions.onShuffle}>
              <Shuffle className="mr-2 h-4 w-4" /> Shuffle
            </ContextMenuItem>
          )}
          {menuActions?.onPlayNext && (
            <ContextMenuItem onSelect={menuActions.onPlayNext}>
              <ListPlus className="mr-2 h-4 w-4" /> Play Next
            </ContextMenuItem>
          )}
          {menuActions?.onAddToQueue && (
            <ContextMenuItem onSelect={menuActions.onAddToQueue}>
              <ListPlus className="mr-2 h-4 w-4" /> Add to Queue
            </ContextMenuItem>
          )}
          {menuActions?.onAddToPlaylist && menuActions.playlists && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>Add to Playlist</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {menuActions.playlists.map((pl) => (
                  <ContextMenuItem
                    key={pl.id}
                    onSelect={() => menuActions.onAddToPlaylist!(pl.id)}
                  >
                    {pl.name}
                  </ContextMenuItem>
                ))}
                {menuActions.playlists.length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    No playlists
                  </div>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          {(menuActions?.onEdit || menuActions?.onDelete) && (
            <ContextMenuSeparator />
          )}
          {menuActions?.onEdit && (
            <ContextMenuItem onSelect={menuActions.onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </ContextMenuItem>
          )}
          {menuActions?.onDelete && (
            <ContextMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
              onSelect={menuActions.onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return row;
});
