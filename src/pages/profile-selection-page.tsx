import { useEffect, useState, useRef } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useSettingsStore } from "@/stores/settings-store";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Camera, Pencil } from "lucide-react";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";
import { useProfileStore, Profile } from "@/stores/profile-store";
import { logger } from "@/lib/logger";

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

export default function ProfileSelectionPage() {
  const {
    profiles,
    loadProfiles,
    createProfile,
    updateProfile,
    selectProfile,
    deleteProfile,
  } = useProfileStore();
  const { loadSettings } = useSettingsStore();

  const [isManageMode, setIsManageMode] = useState(false); // Renamed from isEditing for clarity
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Form State
  const [name, setName] = useState("");
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [avatarPath, setAvatarPath] = useState<string | undefined>(undefined);
  const [avatarBytes, setAvatarBytes] = useState<Uint8Array | undefined>(
    undefined
  );
  const [tempAvatarPreview, setTempAvatarPreview] = useState<
    string | undefined
  >(undefined);

  // Crop State
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  // Use scroll mask for the profile list
  useScrollMask(32, scrollRef);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleSelectProfile = async (id: string) => {
    if (isManageMode) return;
    await selectProfile(id);
    await loadSettings(id);
  };

  const openCreateDialog = () => {
    setEditingProfileId(null);
    setName("");
    setColor(AVATAR_COLORS[0]);
    setAvatarPath(undefined);
    setAvatarBytes(undefined);
    setTempAvatarPreview(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setName(profile.name);
    setColor(profile.color);
    setAvatarPath(profile.avatarPath);
    setAvatarBytes(undefined);
    setTempAvatarPreview(undefined); // Reset preview
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (editingProfileId) {
      // Update
      await updateProfile(
        editingProfileId,
        { name, color, avatarPath: avatarPath },
        avatarBytes // Pass bytes separately
      );
    } else {
      // Create
      await createProfile(name, color, avatarPath, avatarBytes);
    }
    setDialogOpen(false);
  };

  const handleAvatarUpload = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "webp"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        // Open Crop Dialog instead of setting path directly
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

  // Need to handle determining if we need to upload on save.
  // Actually, we can just do it in the UI `handleSave` by invoking the command if `avatarPath` changed.
  // But for Create, we don't have ID.
  // Let's move ID generation to UI? Or update Store to return ID.
  // Let's update Store to return ID.

  // IGNORE Store update for now to avoid context switch loops.
  // Workaround:
  // For now, I will NOT copy the file on creation, I'll just link it.
  // Later I can improve "Copy to AppData".
  // User said "upload a profile picture", implying storage.

  // Better plan:
  // In `handleSave`:
  // If (create):
  //    await createProfile(..., avatarPath)
  //    -> Update `createProfile` in store to:
  //       1. Generate ID.
  //       2. If avatarPath provided, invoke `upload_profile_avatar(id, avatarPath)`.
  //       3. Use the RESULTING path in the `newProfile` object.
  // Check! `createProfile` in store *already* creates uuid. I just need to add the logic there.

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteProfile(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="h-screen w-full bg-background gap-6 text-foreground flex flex-col items-center justify-center pt-16 pb-6 animate-in fade-in duration-700 overflow-hidden">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Who's listening?
        </h1>
        <p className="text-muted-foreground text-base">
          Select your profile to continue
        </p>
      </div>

      <div
        ref={scrollRef}
        className="h-min w-full max-w-5xl overflow-y-auto px-6 scroll-mask-y custom-scrollbar"
      >
        <div className="min-h-full flex flex-wrap content-center justify-center gap-y-6 gap-x-4 pb-4 pt-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => handleSelectProfile(profile.id)}
              className={`group relative flex flex-col items-center gap-2 w-28 cursor-pointer transition-all duration-300 ${
                isManageMode ? "" : "hover:scale-105"
              }`}
            >
              <div className="relative w-28 h-28">
                {profile.avatarPath ? (
                  <img
                    src={convertFileSrc(profile.avatarPath)}
                    alt={profile.name}
                    className="w-full h-full rounded-full object-cover shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)] ring-2 ring-transparent group-hover:ring-primary/50 transition-all duration-300"
                  />
                ) : (
                  <div
                    className={`w-full h-full rounded-full ${profile.color} flex items-center justify-center text-4xl font-bold shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)] ring-2 ring-transparent group-hover:ring-primary/50 text-white transition-all duration-300`}
                  >
                    {profile.name[0]?.toUpperCase()}
                  </div>
                )}

                {isManageMode && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center gap-2 animate-in fade-in duration-200 backdrop-blur-[1px]">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(profile);
                      }}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(profile.id);
                      }}
                      className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </div>
              <span className="text-foreground/80 group-hover:text-foreground text-sm font-medium truncate max-w-full tracking-tight transition-colors">
                {profile.name}
              </span>
            </div>
          ))}

          {/* Add Profile Button */}
          {!isManageMode && profiles.length < 5 && (
            <div
              onClick={openCreateDialog}
              className="group flex flex-col items-center gap-2 w-28 cursor-pointer hover:scale-105 transition-all duration-300"
            >
              <div className="w-28 h-28 rounded-full bg-secondary/30 border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 group-hover:bg-secondary/50 flex items-center justify-center transition-all duration-300">
                <Plus className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-muted-foreground group-hover:text-foreground text-sm font-medium tracking-tight transition-colors">
                Add Profile
              </span>
            </div>
          )}
        </div>
      </div>

      <Button
        variant={isManageMode ? "default" : "outline"}
        size="lg"
        className={`
            px-8 py-6 text-base font-semibold tracking-wide transition-all duration-300
            ${
              isManageMode
                ? "bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                : "border-white/10 hover:bg-white/5 hover:text-white"
            }
          `}
        onClick={() => setIsManageMode(!isManageMode)}
      >
        {isManageMode ? "Done" : "Manage Profiles"}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProfileId ? "Edit Profile" : "Add Profile"}
            </DialogTitle>
          </DialogHeader>
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
                  className="bg-card border-none text-lg h-12"
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
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-24"
              disabled={!name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Profile?"
        description="This will permanently delete this profile and all its data."
        confirmText="Delete Profile"
        variant="destructive"
        onConfirm={confirmDelete}
      />

      <ImageCropDialog
        imageSrc={selectedImageSrc}
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
