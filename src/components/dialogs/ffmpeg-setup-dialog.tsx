import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { Loader2, FolderOpen, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type FFmpegStatus =
  | { status: "Ready"; path: string }
  | { status: "Missing" }
  | { status: "ManualRequired" };

interface DownloadProgress {
  progress: number;
  total: number;
}

export function FFmpegSetupDialog({ onReady }: { onReady: () => void }) {
  const [status, setStatus] = useState<
    "checking" | "missing" | "downloading" | "ready"
  >("checking");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const result = await invoke<FFmpegStatus>("check_ffmpeg_status");
      if (result.status === "Ready") {
        onReady();
      } else {
        setStatus("missing");
      }
    } catch (e) {
      console.error("Failed to check ffmpeg status:", e);
      setError("Failed to check system dependencies.");
    }
  }, [onReady]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleDownload = async () => {
    setStatus("downloading");
    setError(null);
    setDownloadProgress(0);

    const unlisten = await listen<DownloadProgress>(
      "download-progress",
      (event) => {
        const { progress, total } = event.payload;
        if (total > 0) {
          setDownloadProgress((progress / total) * 100);
        }
      }
    );

    try {
      await invoke("download_ffmpeg");
      setStatus("ready");
      setTimeout(onReady, 1000); // Brief delay to show completion
    } catch (e) {
      console.error("Download failed:", e);
      setStatus("missing");
      setError("Download failed. Please check your internet connection.");
    } finally {
      unlisten();
    }
  };

  const handleManualLocate = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "FFmpeg Executable",
            extensions: ["exe", ""], // Windows .exe, Unix no extension
          },
        ],
      });

      if (selected && typeof selected === "string") {
        // Validate via backend
        await invoke("manual_set_ffmpeg_path", { path: selected });
        setStatus("ready");
        setTimeout(onReady, 1000);
      }
    } catch (e) {
      console.error("Manual locate failed:", e);
      toast.error("Invalid FFmpeg binary", {
        description: "The selected file could not be verified.",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icons */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            {status === "checking" ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : status === "downloading" ? (
              <Download className="w-8 h-8 animate-bounce text-primary" />
            ) : status === "missing" ? (
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            ) : (
              <FolderOpen className="w-8 h-8 text-green-500" />
            )}
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">
              {status === "checking" && "Checking Dependencies..."}
              {status === "missing" && "Audio Engine Required"}
              {status === "downloading" && "Setting up Audio Engine..."}
              {status === "ready" && "Ready!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {status === "checking" && "Verifying FFmpeg installation..."}
              {status === "missing" &&
                "Vibe Music requires FFmpeg to analyze your library. We can download it automatically (~20MB)."}
              {status === "downloading" &&
                `Downloading components... ${Math.round(downloadProgress)}%`}
            </p>
          </div>

          {/* Actions */}
          {status === "missing" && (
            <div className="flex flex-col w-full gap-3 pt-4">
              <Button onClick={handleDownload} className="w-full" size="lg">
                <Download className="w-4 h-4 mr-2" />
                Download automatically
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleManualLocate}
                className="w-full"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Locate manually
              </Button>
            </div>
          )}

          {/* Progress Bar */}
          {status === "downloading" && (
            <Progress value={downloadProgress} className="w-full h-2" />
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md w-full">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
