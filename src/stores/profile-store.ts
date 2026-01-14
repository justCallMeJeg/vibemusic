import { create } from "zustand";
import { load, Store } from "@tauri-apps/plugin-store";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import { useLibraryStore } from "./library-store";

export interface Profile {
  id: string;
  name: string;
  color: string; // Hex or tailwind class info
  avatarPath?: string;
}

interface ProfileState {
  profiles: Profile[];
  activeProfileId: string | null;
  isLoading: boolean;

  // Actions
  loadProfiles: () => Promise<void>;
  createProfile: (
    name: string,
    color: string,
    avatarPath?: string,
    avatarBytes?: Uint8Array
  ) => Promise<void>;
  updateProfile: (
    id: string,
    updates: Partial<Profile>,
    avatarBytes?: Uint8Array
  ) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;
}

let storePromise: Promise<Store> | null = null;

const getStore = async () => {
  if (!storePromise) {
    storePromise = load("profiles.json");
  }
  return storePromise;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  activeProfileId: null,
  isLoading: true,

  loadProfiles: async () => {
    try {
      const store = await getStore();
      const profiles = (await store.get<Profile[]>("profiles")) || [];
      const activeProfileId = await store.get<string>("activeProfileId");

      if (profiles.length === 0) {
        // Auto-create default profile
        const defaultProfile: Profile = {
          id: uuidv4(),
          name: "Default",
          color: "bg-blue-500",
        };
        const newProfiles = [defaultProfile];

        await store.set("profiles", newProfiles);
        await store.set("activeProfileId", defaultProfile.id);
        await store.save();

        // Notify backend FIRST
        await invoke("set_active_profile", { profileId: defaultProfile.id });
        set({
          profiles: newProfiles,
          activeProfileId: defaultProfile.id,
          isLoading: false,
        });
      } else {
        // Notify backend FIRST if we have an ID
        if (activeProfileId) {
          await invoke("set_active_profile", { profileId: activeProfileId });
        }
        set({ profiles, activeProfileId, isLoading: false });
      }
    } catch (e) {
      console.error("Failed to load profiles:", e);
      set({ isLoading: false });
    }
  },

  // ... (create/update/delete unchanged)

  createProfile: async (name, color, avatarPath, avatarBytes) => {
    const id = uuidv4();
    let finalAvatarPath = avatarPath;

    if (avatarBytes) {
      try {
        finalAvatarPath = await invoke("save_profile_avatar_bytes", {
          profileId: id,
          imageData: Array.from(avatarBytes),
        });
      } catch (e) {
        console.error("Failed to save avatar bytes", e);
      }
    } else if (avatarPath) {
      try {
        finalAvatarPath = await invoke("upload_profile_avatar", {
          profileId: id,
          filePath: avatarPath,
        });
      } catch (e) {
        console.error("Failed to upload avatar", e);
      }
    }

    const newProfile: Profile = {
      id,
      name,
      color,
      avatarPath: finalAvatarPath,
    };

    const { profiles } = get();
    const newProfiles = [...profiles, newProfile];

    set({ profiles: newProfiles });

    const store = await getStore();
    await store.set("profiles", newProfiles);
    await store.save();
  },

  updateProfile: async (id, updates, avatarBytes) => {
    const { profiles } = get();

    // Check if avatarPath is being updated
    const finalUpdates = { ...updates };

    if (avatarBytes) {
      try {
        const savedPath = await invoke<string>("save_profile_avatar_bytes", {
          profileId: id,
          imageData: Array.from(avatarBytes),
        });
        finalUpdates.avatarPath = savedPath;
      } catch (e) {
        console.error("Failed to save avatar bytes", e);
      }
    } else if (updates.avatarPath) {
      try {
        const savedPath = await invoke<string>("upload_profile_avatar", {
          profileId: id,
          filePath: updates.avatarPath,
        });
        finalUpdates.avatarPath = savedPath;
      } catch (e) {
        console.error("Failed to upload avatar", e);
        // Keep original path if failure? Or fail?
        // For now catch and log, maybe keep temp path which might work if local?
        // No, if upload fails, better to not save invalid path.
        delete finalUpdates.avatarPath;
      }
    }

    const newProfiles = profiles.map((p) =>
      p.id === id ? { ...p, ...finalUpdates } : p
    );

    set({ profiles: newProfiles });

    const store = await getStore();
    await store.set("profiles", newProfiles);
    await store.save();
  },

  deleteProfile: async (id) => {
    const { profiles, activeProfileId } = get();
    const newProfiles = profiles.filter((p) => p.id !== id);

    set({ profiles: newProfiles });

    if (activeProfileId === id) {
      set({ activeProfileId: null });
    }

    const store = await getStore();
    await store.set("profiles", newProfiles);
    if (activeProfileId === id) {
      await store.set("activeProfileId", null);
    }
    await store.save();

    // Cleanup backend files
    await invoke("delete_profile_data", { profileId: id });
  },

  selectProfile: async (id) => {
    // 0. Reset UI State to prevent ghost data
    // Use true to show skeletons immediately, preventing "Empty State" flash
    useLibraryStore.getState().resetLibrary(true);

    // 1. Notify backend FIRST
    await invoke("set_active_profile", { profileId: id });

    set({ activeProfileId: id });
    const store = await getStore();
    await store.set("activeProfileId", id);
    await store.save();

    // Reload library data for the new profile
    if (id) {
      await useLibraryStore.getState().fetchLibrary();
    }
  },
}));
