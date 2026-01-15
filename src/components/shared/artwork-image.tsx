import { useState, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import placeholderArt from "@/assets/placeholder-art.png";

interface ArtworkImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallback?: string;
  className?: string;
}

export function ArtworkImage({
  src,
  fallback = placeholderArt,
  className,
  alt,
  ...props
}: ArtworkImageProps) {
  const [error, setError] = useState(false);

  const imageSrc = useMemo(() => {
    if (error || !src) return fallback;
    return convertFileSrc(src);
  }, [src, error, fallback]);

  return (
    <img
      src={imageSrc}
      alt={alt || "Artwork"}
      className={cn("w-full h-full object-cover", className)}
      onError={() => setError(true)}
      loading="lazy"
      {...props}
    />
  );
}
