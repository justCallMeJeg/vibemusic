import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardItem } from "@/components/shared/card-item";
import type { Album } from "@/lib/api";

interface AlbumCarouselProps {
  albums: Album[];
  onAlbumClick: (albumId: number) => void;
  onPlayAlbum: (albumId: number) => void;
  onShuffleAlbum?: (albumId: number) => Promise<void>;
  onAddToAlbumQueue?: (albumId: number) => Promise<void>;
}

export function AlbumCarousel({ albums, onAlbumClick, onPlayAlbum, onShuffleAlbum, onAddToAlbumQueue }: AlbumCarouselProps) {
  const albumsScrollRef = useRef<HTMLDivElement>(null);

  const scrollAlbums = (direction: "left" | "right") => {
    if (albumsScrollRef.current) {
      const scrollAmount = 300;
      albumsScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section id="artist-albums-section" className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          Albums
        </h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scrollAlbums("left")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scrollAlbums("right")}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div
        ref={albumsScrollRef}
        className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
      >
        {albums.map((album, idx) => (
          <div key={album.id} className="w-40 min-w-40" data-album-index={idx}>
            <CardItem
              title={album.title}
              subtitle={
                album.year ? String(album.year) : "Unknown Year"
              }
              artworkSrc={album.artwork_path || undefined}
              artworkType="album"
              variant="compact"
              onClick={() => onAlbumClick(album.id)}
              onPlay={() => onPlayAlbum(album.id)}
              menuActions={{
                onPlay: () => onPlayAlbum(album.id),
                onShuffle: onShuffleAlbum ? () => onShuffleAlbum(album.id) : undefined,
                onAddToQueue: onAddToAlbumQueue ? () => onAddToAlbumQueue(album.id) : undefined,
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
