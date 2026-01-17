import { Button } from "@/components/ui/button";
import { ChevronLeft, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { forwardRef, memo } from "react";

interface CompactPageHeaderProps {
  title: string;
  subtitle?: string;
  artworkSrc?: string;
  onBack: () => void;
  onPlay?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CompactPageHeader = memo(
  forwardRef<HTMLDivElement, CompactPageHeaderProps>(
    (
      { title, subtitle, artworkSrc, onBack, onPlay, className, style },
      ref
    ) => {
      return (
        <div
          ref={ref}
          className={cn(
            "absolute top-0 left-0 right-0 h-16 backdrop-blur-md border-b flex items-center px-4 gap-4 z-50 transition-opacity duration-200 opacity-0 pointer-events-none data-[visible=true]:pointer-events-auto will-change-[opacity]",
            className
          )}
          style={style}
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft size={20} />
            </Button>
            {onPlay && (
              <Button
                size="icon"
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8"
                onClick={onPlay}
              >
                <Play size={14} fill="currentColor" />
              </Button>
            )}
          </div>

          {artworkSrc && (
            <img
              src={artworkSrc}
              alt={title}
              className="w-8 h-8 rounded-md object-cover shadow-sm bg-card"
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
    }
  )
);

CompactPageHeader.displayName = "CompactPageHeader";
