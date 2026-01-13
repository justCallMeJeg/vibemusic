import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
      console.error(e);
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-medium mb-4">Who's listening?</h1>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-8 max-w-4xl px-8">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            onClick={() => handleSelectProfile(profile.id)}
            className={`group flex flex-col items-center gap-4 w-32 cursor-pointer transition-transform ${
              isManageMode ? "" : "hover:scale-105"
            }`}
          >
            <div className="relative">
              {profile.avatarPath ? (
                <img
                  src={convertFileSrc(profile.avatarPath)}
                  alt={profile.name}
                  className="w-32 h-32 rounded-md object-cover shadow-lg group-hover:ring-4 ring-white/20 transition-all"
                />
              ) : (
                <div
                  className={`w-32 h-32 rounded-md ${profile.color} flex items-center justify-center text-4xl font-bold shadow-lg group-hover:ring-4 ring-white/20 transition-all`}
                >
                  {profile.name[0]?.toUpperCase()}
                </div>
              )}

              {isManageMode && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-4 rounded-md opacity-100 transition-all">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(profile);
                    }}
                    className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                  >
                    <Pencil className="w-6 h-6" />
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(profile.id);
                    }}
                    className="p-2 rounded-full hover:bg-red-500/20 text-red-500 transition-colors"
                  >
                    <Trash2 className="w-6 h-6" />
                  </div>
                </div>
              )}
            </div>
            <span className="text-gray-400 group-hover:text-white text-lg truncate max-w-full font-medium">
              {profile.name}
            </span>
          </div>
        ))}

        {/* Add Profile Button */}
        {!isManageMode && (
          <div
            onClick={openCreateDialog}
            className="group flex flex-col items-center gap-4 w-32 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="w-32 h-32 rounded-md bg-transparent border-2 border-white/20 group-hover:bg-white group-hover:border-white flex items-center justify-center transition-all">
              <Plus className="w-16 h-16 text-gray-400 group-hover:text-black" />
            </div>
            <span className="text-gray-400 group-hover:text-white text-lg font-medium">
              Add Profile
            </span>
          </div>
        )}
      </div>

      <div className="mt-16">
        <Button
          variant="outline"
          size="lg"
          className={` tracking-widest uppercase font-medium px-8 py-6 text-gray-400 hover:text-white border-gray-600 hover:border-white rounded-none ${
            isManageMode
              ? "bg-white text-black hover:bg-white hover:text-black"
              : "bg-transparent"
          }`}
          onClick={() => setIsManageMode(!isManageMode)}
        >
          {isManageMode ? "Done" : "Manage Profiles"}
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white sm:max-w-md">
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
                  className="bg-neutral-800 border-none text-lg h-12"
                  autoFocus
                />
                <span className="text-xs text-gray-500">
                  Click the avatar to upload an image.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-gray-500 font-bold tracking-wider">
                Color
              </label>
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full ${c} ${
                      color === c
                        ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900"
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
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              className="bg-white text-black hover:bg-gray-200 min-w-24"
              disabled={!name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QUIT DIALOG etc (reused from App.tsx via return logic? No, App.tsx renders it. This is child.) 
          Wait, App.tsx rendered quit dialog when !activeProfileId.
          ProfileSelectionPage is rendered INSIDE App.tsx.
          So ProfileSelectionPage doesn't need to render QuitDialog.
      */}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete this profile and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={confirmDelete}
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImageCropDialog
        imageSrc={selectedImageSrc}
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
