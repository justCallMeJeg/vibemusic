import { Button } from "@/components/ui/button";
import { ChevronLeft, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { ArtworkImage } from "@/components/shared/artwork-image";

interface CompactPageHeaderProps {
  title: string;
  subtitle?: string;
  artworkPath?: string | null;
  onBack: () => void;
  onPlay?: () => void;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
}

export const CompactPageHeader = memo(
  ({
    title,
    subtitle,
    artworkPath,
    onBack,
    onPlay,
    className,
    style,
    ref,
  }: CompactPageHeaderProps) => {
    return (
      <div
        ref={ref}
        className={cn(
          "absolute top-0 left-0 right-0 h-24 backdrop-blur-md border-b flex items-center px-4 gap-4 z-50 transition-opacity duration-200 opacity-0 pointer-events-none data-[visible=true]:pointer-events-auto will-change-[opacity]",
          className,
        )}
        style={style}
      >
        <div className="flex items-center gap-2 h-full">
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon"
            onClick={onBack}
          >
            <ChevronLeft size={20} />
          </Button>
          {onPlay && (
            <Button
              aria-label="Play"
              size="icon"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8"
              onClick={onPlay}
            >
              <Play size={14} fill="currentColor" />
            </Button>
          )}
        </div>

        {artworkPath && (
          <ArtworkImage
            src={artworkPath}
            alt={title}
            className="w-8 h-8 rounded-md shadow-sm bg-card"
          />
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-bold text-sm truncate">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground truncate">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  },
);
CompactPageHeader.displayName = "CompactPageHeader";
