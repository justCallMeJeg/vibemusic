import { Clock, Play } from "lucide-react";
import { Track } from "@/lib/api";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAudio } from "@/context/audio-context";

interface MusicCardProps {
  track: Track;
  context?: Track[];
}

function MusicCard({ track, context }: MusicCardProps) {
  const { play, currentTrack, status } = useAudio();
  const isPlaying = currentTrack?.id === track.id && status === "playing";

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      onClick={() => play(track, context)}
      className={`flex w-full h-min rounded-lg px-4 py-2 hover:outline hover:outline-gray-850 hover:bg-white/3 cursor-pointer group transition-colors ${
        isPlaying ? "bg-white/10 outline outline-gray-800" : ""
      }`}
    >
      <div className="flex h-min w-full gap-4">
        <div className="relative">
          <img
            className="aspect-square h-10 rounded-lg object-cover bg-neutral-800"
            src={
              track.artwork_path
                ? convertFileSrc(track.artwork_path)
                : "src/assets/placeholder-art.jpg"
            }
            alt="Album Art"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
              <Play size={16} className="fill-white text-white" />
            </div>
          )}
        </div>

        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col h-min w-full">
            <p className="text-white text-base font-bold line-clamp-1">
              {track.title}
            </p>
            <p className="text-gray-400 text-xs font-normal line-clamp-1">
              {track.artist || "Unknown Artist"}
            </p>
          </div>
          <div className="flex gap-1 h-min items-center shrink-0">
            <Clock color="gray" size={12} />
            <p className="text-gray-400 text-xs font-normal">
              {formatDuration(track.duration_ms)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MusicCard;
