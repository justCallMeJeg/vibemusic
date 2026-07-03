import { useEffect, useState, useRef } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useSettingsStore } from "@/stores/settings-store";
import { useAudioStore } from "@/stores/audio-store";
import { logger } from "@/lib/logger";
import { Pencil, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileManageDialog } from "@/components/dialogs/profile-manage-dialog";
import { useProfileStore, Profile } from "@/stores/profile-store";
import { EmptyState } from "@/components/shared/empty-state";
import { ArtworkImage } from "@/components/shared/artwork-image";

export default function ProfileSelectionPage() {
  const {
    profiles,
    loadProfiles,
    createProfile,
    updateProfile,
    selectProfile,
    deleteProfile,
    isLoading,
  } = useProfileStore();
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const [isManageMode, setIsManageMode] = useState(false); // Renamed from isEditing for clarity
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null); // For playback warning
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get audio state to check if playback is active
  const currentTrack = useAudioStore((s) => s.currentTrack);
  const status = useAudioStore((s) => s.status);
  const stop = useAudioStore((s) => s.stop);

  // Use scroll mask for the profile list
  useScrollMask(32, scrollRef);

  useEffect(() => {
    (async () => {
      try {
        await loadProfiles();
      } catch (err) {
        logger.error("Failed to load profiles", err);
      }
    })();
  }, [loadProfiles]);

  const handleSelectProfile = async (id: string) => {
    if (isManageMode) return;

    // Check if playback is active
    const isPlaying =
      currentTrack && (status === "playing" || status === "paused");
    if (isPlaying) {
      setPendingProfileId(id);
      return;
    }

    await Promise.all([
      selectProfile(id),
      loadSettings(id),
    ]);
  };

  const confirmProfileSwitch = async () => {
    if (pendingProfileId) {
      await stop();
      await Promise.all([
        selectProfile(pendingProfileId),
        loadSettings(pendingProfileId),
      ]);
      setPendingProfileId(null);
    }
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

  if (isLoading && profiles.length === 0) {
    return (
      <div className="h-screen w-full bg-background gap-6 text-foreground flex flex-col items-center justify-center pt-16 pb-6 animate-in fade-in duration-700 overflow-hidden">
        <div className="text-center">
          <Skeleton className="h-10 w-64 mx-auto bg-foreground/10 rounded-lg" />
          <Skeleton className="h-4 w-48 mx-auto mt-3 bg-foreground/5 rounded-lg" />
        </div>
        <div className="flex gap-4 mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 w-28">
              <Skeleton className="w-28 h-28 rounded-full bg-foreground/5" />
              <Skeleton className="h-4 w-20 bg-foreground/10 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isLoading && profiles.length === 0) {
    return (
      <div className="h-screen w-full bg-background gap-6 text-foreground flex flex-col items-center justify-center pt-16 pb-6 animate-in fade-in duration-700 overflow-hidden">
        <EmptyState
          icon={User}
          title="No profiles yet"
          description="Create a profile to get started with Vibe Music."
          action={
            <Button variant="outline" size="lg" onClick={openCreateDialog}>
              <Plus className="w-5 h-5 mr-2" />
              Create Profile
            </Button>
          }
        />
      </div>
    );
  }

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
        className="h-min w-full max-w-5xl overflow-y-auto px-6 scroll-mask-y "
      >
        <div className="min-h-full flex flex-wrap content-center justify-center gap-y-6 gap-x-4 pb-4 pt-2">
          {profiles.map((profile) => (
            <button
              type="button"
              key={profile.id}
              onClick={() => handleSelectProfile(profile.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelectProfile(profile.id);
                }
              }}
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
                    className="w-full h-full rounded-full flex items-center justify-center text-4xl font-bold shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)] ring-2 ring-transparent group-hover:ring-primary/50 text-white transition-all duration-300"
                    style={{ backgroundColor: profile.color }}
                  >
                    {profile.name[0]?.toUpperCase()}
                  </div>
                )}

                {isManageMode && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center gap-2 animate-in fade-in duration-200 backdrop-blur-[1px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(profile);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          openEditDialog(profile);
                        }
                      }}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(profile.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          setDeleteId(profile.id);
                        }
                      }}
                      className="p-2 rounded-full bg-destructive/20 hover:bg-destructive/40 text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <span className="text-foreground/80 group-hover:text-foreground text-sm font-medium truncate max-w-full tracking-tight transition-colors">
                {profile.name}
              </span>
            </button>
          ))}

          {/* Add Profile Button */}
          {!isManageMode && profiles.length < 5 && (
            <button
              type="button"
              onClick={openCreateDialog}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  openCreateDialog();
                }
              }}
              className="group flex flex-col items-center gap-2 w-28 cursor-pointer hover:scale-105 transition-all duration-300"
            >
              <div className="w-28 h-28 rounded-full bg-secondary/30 border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 group-hover:bg-secondary/50 flex items-center justify-center transition-all duration-300">
                <Plus className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-muted-foreground group-hover:text-foreground text-sm font-medium tracking-tight transition-colors">
                Add Profile
              </span>
            </button>
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

      <ConfirmDialog
        open={!!pendingProfileId}
        onOpenChange={(open) => !open && setPendingProfileId(null)}
        title="Stop Playback?"
        description="Switching profiles will stop the current playback. Do you want to continue?"
        confirmText="Switch Profile"
        onConfirm={confirmProfileSwitch}
      />
    </div>
  );
}
