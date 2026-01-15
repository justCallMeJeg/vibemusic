import { useState } from "react";
import { Playlist, updatePlaylist } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  readFile,
  writeFile,
  mkdir,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import { join, appDataDir } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Loader2, Upload, Pencil } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useLibraryStore } from "@/stores/library-store";
import { Textarea } from "../ui/textarea";
import { ImageCropDialog } from "./image-crop-dialog";

interface PlaylistEditDialogProps {
  playlist: Playlist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlaylistEditDialog({
  playlist,
  open,
  onOpenChange,
}: PlaylistEditDialogProps) {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || "");
  const [isSaving, setIsSaving] = useState(false);

  // Image State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [pendingCoverBytes, setPendingCoverBytes] = useState<Uint8Array | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchPlaylists = useLibraryStore((s) => s.refreshPlaylists);

  const handleSelectImage = async () => {
    try {
      const file = await openDialog({
        multiple: false,
        filters: [
          { name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] },
        ],
      });

      if (file) {
        // Tauri 2: file is path string? Checks docs.
        // open returns null | string | string[] depending on options.
        // With multiple: false, it returns string | null.
        const path = file as string;

        // Read file to blob URL for cropper
        const contents = await readFile(path);
        const blob = new Blob([contents]);
        const url = URL.createObjectURL(blob);
        setCropImageSrc(url);
        setIsCropDialogOpen(true);
      }
    } catch (e) {
      logger.error("Failed to select image", e);
    }
  };

  const handleCropComplete = (croppedBytes: Uint8Array) => {
    setPendingCoverBytes(croppedBytes);
    // Create preview
    const blob = new Blob([croppedBytes as unknown as BlobPart]);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setCropImageSrc(null); // Clear source
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);

    try {
      let finalArtworkPath = playlist.artwork_path;

      if (pendingCoverBytes) {
        // Save to app data
        const fileName = `playlist_${playlist.id}_${Date.now()}.jpg`;

        // Ensure directory exists
        // We'll use BaseDirectory.AppData
        // According to docs, we might need to create it explicitly if it's a subdir
        await mkdir("covers", {
          baseDir: BaseDirectory.AppData,
          recursive: true,
        });

        // Wait, @tauri-apps/api/path join IS async in v2? Let's verify.
        // Actually join is async.
        const pathPart = await join("covers", fileName);

        await writeFile(pathPart, pendingCoverBytes, {
          baseDir: BaseDirectory.AppData,
        });

        const appData = await appDataDir();
        finalArtworkPath = await join(appData, "covers", fileName);
      }

      logger.debug("Saving playlist update", {
        id: playlist.id,
        name,
        description,
        finalArtworkPath,
      });

      await updatePlaylist(
        playlist.id,
        name,
        description,
        finalArtworkPath || undefined
      );
      await fetchPlaylists(); // Update store list

      // Update local if parent doesn't refresh automatically?
      // Parent wraps this dialog, so we should close it.
      onOpenChange(false);
      toast.success("Playlist updated");

      // Clean up object URLs
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    } catch (e) {
      logger.error("Failed to update playlist", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-popover border-border text-popover-foreground sm:max-w-md"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Make changes to your playlist here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Image Section */}
            <div className="flex flex-col items-center gap-4">
              {/* Image Preview / Selection */}
              <div className="relative group">
                <div
                  className="w-40 h-40 rounded-lg bg-card flex flex-col items-center justify-center cursor-pointer overflow-hidden border border-dashed border-border hover:border-foreground/50 transition-colors"
                  onClick={handleSelectImage}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : playlist.artwork_path ? (
                    <img
                      src={convertFileSrc(playlist.artwork_path)}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload size={24} />
                      <span className="text-xs">Change Cover</span>
                    </div>
                  )}

                  {/* Overlay hint */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Pencil size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-secondary/50 border-border resize-none h-20"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        imageSrc={cropImageSrc}
        open={isCropDialogOpen}
        onOpenChange={setIsCropDialogOpen}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
