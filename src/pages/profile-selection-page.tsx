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
import { useProfileStore } from "@/stores/profile-store";
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
    selectProfile,
    deleteProfile,
  } = useProfileStore();
  const { loadSettings } = useSettingsStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleSelectProfile = async (id: string) => {
    if (isEditing) return; // Don't select in edit mode

    await selectProfile(id);
    await loadSettings(id);
  };

  const handleCreate = async () => {
    if (!newProfileName.trim()) return;
    await createProfile(newProfileName, selectedColor);
    setIsCreateOpen(false);
    setNewProfileName("");
    setSelectedColor(AVATAR_COLORS[0]);
  };

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
              isEditing ? "" : "hover:scale-105"
            }`}
          >
            <div className="relative">
              <div
                className={`w-32 h-32 rounded-md ${profile.color} flex items-center justify-center text-4xl font-bold shadow-lg group-hover:ring-4 ring-white/20 transition-all`}
              >
                {profile.name[0]?.toUpperCase()}
              </div>
              {isEditing && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(profile.id);
                  }}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md opacity-100 hover:bg-black/80 transition-colors"
                >
                  <Trash2 className="w-10 h-10 text-red-500" />
                </div>
              )}
            </div>
            <span className="text-gray-400 group-hover:text-white text-lg truncate max-w-full font-medium">
              {profile.name}
            </span>
          </div>
        ))}

        {/* Add Profile Button */}
        {!isEditing && (
          <div
            onClick={() => setIsCreateOpen(true)}
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
            isEditing
              ? "bg-white text-black hover:bg-white hover:text-black"
              : "bg-transparent"
          }`}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "Done" : "Manage Profiles"}
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-md ${selectedColor} flex items-center justify-center text-xl font-bold shrink-0`}
              >
                {newProfileName[0]?.toUpperCase() || "?"}
              </div>
              <Input
                placeholder="Name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                className="bg-neutral-800 border-none text-lg h-12"
                autoFocus
              />
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
                      selectedColor === c
                        ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleCreate}
              className="bg-white text-black hover:bg-gray-200 min-w-24"
              disabled={!newProfileName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete this profile and all its data (music
              library, history, and settings). This action cannot be undone.
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
    </div>
  );
}
