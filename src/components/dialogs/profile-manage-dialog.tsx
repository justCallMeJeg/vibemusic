import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";
import { StandardDialog } from "@/components/shared/standard-dialog";
import { Profile } from "@/stores/profile-store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { logger } from "@/lib/logger";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";

const AVATAR_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
];

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
  const [name, setName] = useState("");
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [avatarPath, setAvatarPath] = useState<string | undefined>(undefined);
  const [avatarBytes, setAvatarBytes] = useState<Uint8Array | undefined>(
    undefined
  );
  const [tempAvatarPreview, setTempAvatarPreview] = useState<
    string | undefined
  >(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Crop State
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  // Initialize form when opening/profile changes
  useEffect(() => {
    if (open) {
      if (profile) {
        setName(profile.name);
        setColor(profile.color);
        setAvatarPath(profile.avatarPath);
        setAvatarBytes(undefined);
        setTempAvatarPreview(undefined);
      } else {
        setName("");
        setColor(AVATAR_COLORS[0]);
        setAvatarPath(undefined);
        setAvatarBytes(undefined);
        setTempAvatarPreview(undefined);
      }
    }
  }, [open, profile]);

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
    setAvatarBytes(croppedBytes);

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
      await onSave(name, color, avatarPath, avatarBytes);
      onOpenChange(false);
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
        open={open}
        onOpenChange={onOpenChange}
        title={profile ? "Edit Profile" : "Add Profile"}
        footer={footer}
        contentClassName="sm:max-w-md"
      >
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-4">
            <div
              className={`relative w-20 h-20 rounded-md overflow-hidden flex items-center justify-center text-xl font-bold shrink-0 group cursor-pointer ${
                !avatarPath && !tempAvatarPreview ? color : ""
              }`}
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
            </div>

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
            <label className="text-xs uppercase text-muted-foreground font-bold tracking-wider">
              Color
            </label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full ${c} ${
                    color === c
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover"
                      : "opacity-70 hover:opacity-100"
                  }`}
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
