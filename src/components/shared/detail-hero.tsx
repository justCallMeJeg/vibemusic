import { Button } from "@/components/ui/button";
import { Play, Shuffle } from "lucide-react";
import placeholderArt from "@/assets/placeholder-art.png";
import { cn } from "@/lib/utils";

interface DetailHeroProps {
  title: string;
  subtitle?: string;
  tertiaryText?: string;
  artworkSrc?: string;
  onPlay?: () => void;
  onShuffle?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function DetailHero({
  title,
  subtitle,
  tertiaryText,
  artworkSrc,
  onPlay,
  onShuffle,
  className,
  children,
}: DetailHeroProps) {
  return (
    <div className={cn("flex gap-6 mb-6 px-2", className)}>
      <img
        className="w-40 h-40 rounded-lg object-cover bg-card shrink-0 shadow-md"
        src={artworkSrc || placeholderArt}
        onError={(e) => {
          e.currentTarget.src = placeholderArt;
        }}
        alt={title}
      />
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <h2 className="text-3xl font-bold text-foreground line-clamp-2 leading-tight">
          {title}
        </h2>
        {tertiaryText && (
          <p className="text-muted-foreground text-sm mt-2">{tertiaryText}</p>
        )}
        {subtitle && (
          <p className="text-muted-foreground text-lg font-medium mt-1">
            {subtitle}
          </p>
        )}

        <div className="flex gap-3 mt-6 items-center">
          {onPlay && (
            <Button
              variant="default"
              size="lg"
              onClick={onPlay}
              className="gap-2 rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90 h-12"
            >
              <Play size={22} fill="currentColor" />
              Play
            </Button>
          )}
          {onShuffle && (
            <Button
              variant="outline"
              size="lg"
              onClick={onShuffle}
              className="gap-2 rounded-full h-12 px-6"
            >
              <Shuffle size={20} />
              Shuffle
            </Button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
