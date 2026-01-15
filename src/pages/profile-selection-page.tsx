import { useEffect, useState, useRef } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useSettingsStore } from "@/stores/settings-store";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileManageDialog } from "@/components/dialogs/profile-manage-dialog";
import { useProfileStore, Profile } from "@/stores/profile-store";

import { ArtworkImage } from "@/components/shared/artwork-image";

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
    setDialogOpen(true);
  };

  const openEditDialog = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setDialogOpen(true);
  };

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
                  <ArtworkImage
                    src={profile.avatarPath}
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

      <ProfileManageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={
          editingProfileId
            ? profiles.find((p) => p.id === editingProfileId)
            : null
        }
        onSave={async (name, color, avatarPath, avatarBytes) => {
          if (editingProfileId) {
            await updateProfile(
              editingProfileId,
              { name, color, avatarPath },
              avatarBytes
            );
          } else {
            await createProfile(name, color, avatarPath, avatarBytes);
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Profile?"
        description="This will permanently delete this profile and all its data."
        confirmText="Delete Profile"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
