import { memo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { DynamicPlaceholder } from "@/components/shared/dynamic-placeholder";

interface ArtworkImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  placeholderType?: "artist" | "track" | "playlist" | "album";
  className?: string;
  alt?: string;
}

export const ArtworkImage = memo(function ArtworkImage({
  src,
  placeholderType,
  className,
  alt,
  ...props
}: ArtworkImageProps) {
  const [error, setError] = useState(false);
  const isFallback = error || !src;

  if (isFallback) {
    return (
      <DynamicPlaceholder
        type={placeholderType || "track"}
        title={alt}
        className={className}
      />
    );
  }

  return (
    <img
      src={convertFileSrc(src)}
      alt={alt || "Artwork"}
      className={cn("w-full h-full object-cover", className)}
      onError={() => setError(true)}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
});
