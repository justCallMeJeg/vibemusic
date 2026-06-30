import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import homepageImg from "@/assets/features/homepage.png";
import lyricsImg from "@/assets/features/lyrics.png";
import insightsImg from "@/assets/features/insights.png";

const images = [
  { src: homepageImg, alt: "VibeMusic player interface" },
  { src: lyricsImg, alt: "VibeMusic lyrics view" },
  { src: insightsImg, alt: "VibeMusic listening insights" },
];

export default function ScreenshotCarousel() {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  }, []);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-full group">
      {images.map((img, i) => (
        <img
          key={i}
          src={img.src}
          alt={img.alt}
          className={`absolute inset-0 w-fit h-full object-contain transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <button
        onClick={prev}
        aria-label="Previous screenshot"
        className="absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-background/90 transition-all duration-200 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring -outline-offset-2"
      >
        <ChevronLeft className="size-4 text-foreground" />
      </button>
      <button
        onClick={next}
        aria-label="Next screenshot"
        className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-background/90 transition-all duration-200 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring -outline-offset-2"
      >
        <ChevronRight className="size-4 text-foreground" />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to screenshot ${i + 1}`}
            className={`size-1.5 rounded-full transition-all duration-300 ${
              i === current ? "bg-foreground w-4" : "bg-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
