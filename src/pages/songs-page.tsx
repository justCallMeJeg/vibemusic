import { useEffect, useState, useCallback } from "react";
import { getTracks, Track } from "@/lib/api";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import MusicListItem from "@/components/ui/music-list";

interface SongsPageProps {
  onTracksLoaded?: (tracks: Track[]) => void;
}

export default function SongsPage({ onTracksLoaded }: SongsPageProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const loadTracks = useCallback(async () => {
    try {
      const data = await getTracks();
      setTracks(data);
      onTracksLoaded?.(data);
    } catch (error) {
      console.error("Failed to load tracks:", error);
    }
  }, [onTracksLoaded]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const handleFolderImport = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        setIsScanning(true);
        console.log("Scanning folder:", selected);
        await invoke("scan_music_library", { folders: [selected] });
        await loadTracks();
      }
    } catch (error) {
      console.error("Failed to import folder:", error);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold ml-1">Songs</h1>
        <button
          onClick={handleFolderImport}
          disabled={isScanning}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isScanning
              ? "bg-blue-500/20 text-blue-400 cursor-wait"
              : "bg-white/5 hover:bg-white/10 text-white"
          }`}
        >
          {isScanning ? "Scanning..." : "Import Folder"}
        </button>
      </div>

      <div
        id="song-list"
        className="flex flex-col flex-1 overflow-y-auto gap-1"
      >
        {tracks.length === 0 ? (
          <div className="text-gray-500 text-center p-8">
            {isScanning
              ? "Scanning for music..."
              : "No songs found. Click 'Import Folder' to add music."}
          </div>
        ) : (
          tracks.map((track) => (
            <MusicListItem key={track.id} track={track} context={tracks} />
          ))
        )}
      </div>
    </div>
  );
}
