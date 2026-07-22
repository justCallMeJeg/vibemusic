import { memo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { MediaContextMenu } from "@/components/shared/media-context-menu";
import { Button } from "@/components/ui/button";
import { DynamicPlaceholder } from "@/components/shared/dynamic-placeholder";
import { useRovingTabindexContext } from "@/hooks/use-roving-tabindex";
import { useInteractionStore } from "@/stores/interaction-store";

const cardVariants = cva(
  "flex flex-col cursor-pointer transition-colors group relative",
  {
    variants: {
      variant: {
        portrait: "rounded-lg p-3 hover:bg-accent/10",
        landscape:
          "flex-row gap-4 p-2 hover:bg-accent/10 rounded-md items-center",
        compact: "w-40 shrink-0 space-y-3",
        circle: "rounded-lg p-3 hover:bg-accent/10 items-center",
      },
    },
    defaultVariants: {
      variant: "portrait",
    },
  },
);

const imageVariants = cva("relative bg-card overflow-hidden shadow-sm", {
  variants: {
    variant: {
      portrait: "aspect-square w-full rounded-lg mb-3",
      landscape: "w-12 h-12 rounded-md shrink-0",
      compact: "aspect-square w-full rounded-xl",
      circle: "aspect-square w-full rounded-full mb-3",
    },
  },
  defaultVariants: {
    variant: "portrait",
  },
});

interface CardItemProps
  extends
    Omit<React.ComponentProps<"button">, "contextMenu">,
    VariantProps<typeof cardVariants> {
  title: string;
  subtitle?: string;
  tertiaryText?: string;
  artworkSrc?: string;
  artworkType?: "album" | "artist" | "playlist";
  rank?: number;
  onPlay?: () => void;
  onClick?: () => void;
  menuActions?: {
    onPlay?: () => void;
    onShuffle?: () => void;
    onPlayNext?: () => void;
    onAddToQueue?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
  };
  /** Index within a keyboard-navigable list/grid. Consumed by RovingTabindexContext. */
  dataItemIndex?: number;
}

export const CardItem = memo(function CardItem({
  title,
  subtitle,
  tertiaryText,
  artworkSrc,
  artworkType = "album",
  variant,
  rank,
  className,
  onPlay,
  onClick,
  menuActions,
  dataItemIndex,
  ...props
}: CardItemProps) {
  const roving = useRovingTabindexContext();
  const rovingTabIndex = dataItemIndex !== undefined ? roving?.getTabIndex(dataItemIndex) : undefined;
  const isRovingActive = dataItemIndex !== undefined && roving?.activeIndex === dataItemIndex;
  const focusSource = useInteractionStore((s) => s.focusSource);
  const resolvedTabIndex = rovingTabIndex !== undefined
    ? rovingTabIndex
    : (dataItemIndex !== undefined && !!roving ? -1 : undefined);
  const isCircle = variant === "circle";
  const isCompact = variant === "compact";

  const artwork = artworkSrc ? (
    <ArtworkImage
      src={artworkSrc}
      alt={title}
      placeholderType={artworkType}
      className="group-hover:scale-[1.02] transition-transform duration-300"
    />
  ) : artworkType === "playlist" ? (
    <DynamicPlaceholder
      type="playlist"
      title={title}
      className="group-hover:scale-[1.02] transition-transform"
    />
  ) : artworkType === "artist" ? (
    <ArtworkImage
      src={undefined}
      alt={title}
      placeholderType="artist"
      className="group-hover:scale-[1.02] transition-transform duration-300"
    />
  ) : (
    <ArtworkImage
      src={undefined}
      alt={title}
      placeholderType="track"
      className="group-hover:scale-[1.02] transition-transform duration-300"
    />
  );

  const CardContent = (
    <button
      {...props}
      type="button"
      onClick={onClick}
      data-item-index={dataItemIndex}
      className={cn(
        cardVariants({ variant, className }),
        isRovingActive && focusSource === "keyboard" && "bg-accent/15 ring-1 ring-ring/30 rounded-md",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring rounded-md",
      )}
      {...(resolvedTabIndex !== undefined ? { tabIndex: resolvedTabIndex } : {})}
    >
      <div className={cn(imageVariants({ variant }), "overflow-visible")}>
        <div
          className={cn(
            "relative w-full h-full overflow-hidden",
            isCircle ? "rounded-full" : "rounded-[inherit]",
          )}
        >
          {artwork}
          {onPlay && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Play"
                className="rounded-full bg-primary text-primary-foreground hover:scale-105 shadow-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
              >
                <Play
                  fill="currentColor"
                  className="ml-1"
                  size={isCompact ? 20 : 24}
                />
              </Button>
            </div>
          )}
        </div>
        {rank !== undefined && (
          <div className="absolute -top-1 -left-1 bg-black/60 backdrop-blur-md text-white shadow-sm rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] z-20 ring-1 ring-white/20">
            {rank}
          </div>
        )}
      </div>

      <div className={cn("min-w-0 flex-1 w-full", isCircle && "text-center")}>
        <div className="font-bold text-sm truncate leading-tight text-left">
          {title}
        </div>
        {subtitle && (
          <div className="text-muted-foreground text-xs truncate mt-0.5 text-left">
            {subtitle}
          </div>
        )}
        {tertiaryText && !isCompact && (
          <div className="text-muted-foreground text-[10px] truncate mt-0.5 text-left">
            {tertiaryText}
          </div>
        )}
      </div>
    </button>
  );

  if (menuActions) {
    return <MediaContextMenu {...menuActions}>{CardContent}</MediaContextMenu>;
  }

  return CardContent;
});
