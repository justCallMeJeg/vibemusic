import { Button } from "@/components/ui/button";
import { Play, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "@/components/shared/artwork-image";

interface DetailHeroProps {
  title: string;
  subtitle?: string;
  tertiaryText?: string;
  artworkPath?: string | null;
  placeholderType?: "artist" | "track";
  onPlay?: () => void;
  onShuffle?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function DetailHero({
  title,
  subtitle,
  tertiaryText,
  artworkPath,
  placeholderType,
  onPlay,
  onShuffle,
  className,
  children,
}: DetailHeroProps) {
  return (
    <div className={cn("flex gap-6 mb-6 ", className)}>
      <ArtworkImage
        src={artworkPath}
        alt={title}
        placeholderType={placeholderType}
        className="w-40 h-40 rounded-lg shrink-0 shadow-md"
      />
      <div className="flex flex-col justify-center min-w-0 flex-1  ">
        <h2 className="text-3xl font-bold text-foreground line-clamp-2 leading-tight ">
          {title}
        </h2>
        {tertiaryText && (
          <p className="text-muted-foreground text-sm ">{tertiaryText}</p>
        )}
        {subtitle && (
          <p className="text-muted-foreground text-lg font-medium ">
            {subtitle}
          </p>
        )}

        <div className="flex gap-3 mt-6 items-center">
          {onPlay && (
            <Button
              aria-label="Play"
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
              aria-label="Shuffle"
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
