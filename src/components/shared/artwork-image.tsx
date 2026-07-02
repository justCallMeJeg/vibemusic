import { useState, useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import placeholderArt from "@/assets/placeholder-art.png";
import { DynamicPlaceholder } from "@/components/shared/dynamic-placeholder";

interface ArtworkImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: string;
  placeholderType?: "artist" | "track" | "playlist";
  className?: string;
}

export function ArtworkImage({
  src,
  fallback = placeholderArt,
  placeholderType,
  className,
  alt,
  ...props
}: ArtworkImageProps) {
  const [error, setError] = useState(false);
  const isFallback = error || !src;

  const imageSrc = useMemo(() => {
    if (isFallback) return fallback;
    return convertFileSrc(src);
  }, [src, fallback, isFallback]);

  if (isFallback && placeholderType) {
    return (
      <DynamicPlaceholder
        type={placeholderType}
        title={alt}
        className={className}
      />
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt || "Artwork"}
      className={cn("w-full h-full object-cover", className)}
      onError={() => setError(true)}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}
