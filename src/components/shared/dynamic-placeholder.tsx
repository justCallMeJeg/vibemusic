import { Music, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicPlaceholderProps {
  type: "artist" | "track" | "playlist" | "album";
  title?: string;
  className?: string;
}

export function DynamicPlaceholder({
  type,
  title,
  className,
}: DynamicPlaceholderProps) {
  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center bg-accent/15",
        className,
      )}
    >
      {type === "playlist" && title ? (
        <span className="text-4xl font-bold select-none text-muted-foreground/40">
          {title.slice(0, 2).toUpperCase()}
        </span>
      ) : (
        <div className="w-2/5 h-2/5 text-muted-foreground/35">
          {type === "artist" ? (
            <User className="w-full h-full" strokeWidth={1.5} />
          ) : (
            <Music className="w-full h-full" strokeWidth={1.5} />
          )}
        </div>
      )}
    </div>
  );
}
