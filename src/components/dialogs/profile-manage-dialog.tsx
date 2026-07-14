import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";
import { StandardDialog } from "@/components/shared/standard-dialog";
import { Profile, AVATAR_COLORS } from "@/stores/profile-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { logger } from "@/lib/logger";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";

interface ProfileManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null; // If null, mode is Create
  onSave: (
    name: string,
    color: string,
    avatarPath: string | undefined,
    avatarBytes: Uint8Array | undefined
  ) => Promise<void>;
}

export function ProfileManageDialog({
  open,
  onOpenChange,
  profile,
  onSave,
}: ProfileManageDialogProps) {
  const [name, setName] = useState(profile?.name ?? "");
  const [color, setColor] = useState(profile?.color ?? AVATAR_COLORS[0]);
  const [avatarPath, setAvatarPath] = useState<string | undefined>(
    profile?.avatarPath ?? undefined
  );
  const avatarBytesRef = useRef<Uint8Array | undefined>(undefined);
  const [tempAvatarPreview, setTempAvatarPreview] = useState<
    string | undefined
  >(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Crop State
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  // Revoke tempAvatarPreview on unmount to avoid memory leak
  useEffect(() => {
    return () => {
      if (tempAvatarPreview) URL.revokeObjectURL(tempAvatarPreview);
    };
  }, [tempAvatarPreview]);

  const formKey = open ? (profile?.id ? `profile-${profile.id}` : "new") : "closed";

  const handleAvatarUpload = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        setSelectedImageSrc(convertFileSrc(selected));
        setCropDialogOpen(true);
      }
    } catch (e) {
      logger.error("Failed to select avatar", e);
    }
  };

  const handleCropComplete = (croppedBytes: Uint8Array) => {
    avatarBytesRef.current = croppedBytes;

    // Create preview
    const blob = new Blob([croppedBytes as unknown as BlobPart], {
      type: "image/jpeg",
    });
    const previewUrl = URL.createObjectURL(blob);
    setTempAvatarPreview(previewUrl);

    // Clear path as we are using bytes now
    setAvatarPath(undefined);
  };

  const handleSaveClick = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(name, color, avatarPath, avatarBytesRef.current);
      onOpenChange(false);
    } catch (e) {
      logger.error("Failed to save profile", e);
    } finally {
      setIsSaving(false);
    }
  };

  const footer = (
    <>
      <Button
        variant="ghost"
        onClick={() => onOpenChange(false)}
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        Cancel
      </Button>
      <Button
        variant="default"
        onClick={handleSaveClick}
        className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-24"
        disabled={!name.trim() || isSaving}
      >
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </>
  );

  return (
    <>
      <StandardDialog
        key={formKey}
        open={open}
        onOpenChange={onOpenChange}
        title={profile ? "Edit Profile" : "Add Profile"}
        footer={footer}
        contentClassName="sm:max-w-md"
      >
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Upload avatar"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleAvatarUpload(); }}
              className="relative w-20 h-20 rounded-md overflow-hidden flex items-center justify-center text-xl font-bold shrink-0 group cursor-pointer"
              style={!avatarPath && !tempAvatarPreview ? { backgroundColor: color } : undefined}
              onClick={handleAvatarUpload}
            >
              {avatarPath || tempAvatarPreview ? (
                <img
                  src={tempAvatarPreview || convertFileSrc(avatarPath!)}
                  className="w-full h-full object-cover"
                  alt="Avatar"
                />
              ) : (
                <span>{name[0]?.toUpperCase() || "?"}</span>
              )}

              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>

            <div className="flex flex-col gap-2 flex-1">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg h-12"
                autoFocus
              />
              <span className="text-xs text-muted-foreground">
                Click the avatar to upload an image.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase text-muted-foreground font-bold tracking-wider">
              Color
            </span>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  className={`w-8 h-8 rounded-full ${
                    color === c
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
      </StandardDialog>

      <ImageCropDialog
        imageSrc={selectedImageSrc}
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
