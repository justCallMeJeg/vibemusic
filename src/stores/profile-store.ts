import { create } from "zustand";
import { load, Store } from "@tauri-apps/plugin-store";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/core";

interface Profile {
  id: string;
  name: string;
  color: string; // Hex or tailwind class info
}

interface ProfileState {
  profiles: Profile[];
  activeProfileId: string | null;
  isLoading: boolean;

  // Actions
  loadProfiles: () => Promise<void>;
  createProfile: (name: string, color: string) => Promise<void>;
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

      set({ profiles, activeProfileId, isLoading: false });

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

        set({ profiles: newProfiles, activeProfileId: defaultProfile.id });
        await invoke("set_active_profile", { profileId: defaultProfile.id });
      } else if (activeProfileId) {
        await invoke("set_active_profile", { profileId: activeProfileId });
      }
    } catch (e) {
      console.error("Failed to load profiles:", e);
      set({ isLoading: false });
    }
  },

  createProfile: async (name, color) => {
    const newProfile: Profile = {
      id: uuidv4(),
      name,
      color,
    };

    const { profiles } = get();
    const newProfiles = [...profiles, newProfile];

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
    set({ activeProfileId: id });
    const store = await getStore();
    await store.set("activeProfileId", id);
    await store.save();

    // Notify backend
    await invoke("set_active_profile", { profileId: id });
  },
}));
