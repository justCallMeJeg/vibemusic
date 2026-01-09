/**
 * Settings Service for VibMusic
 * Handles persistent app settings using Tauri Store
 */

import { Store } from '@tauri-apps/plugin-store';
import type { AppSettings } from '../types/database';
import { DEFAULT_SETTINGS } from '../types/database';

// Store instance singleton
let store: Store | null = null;

const STORE_NAME = 'settings.json';
const SETTINGS_KEY = 'app_settings';

/**
 * Initialize the settings store
 */
export async function initializeSettings(): Promise<Store> {
  if (store) return store;

  store = await Store.load(STORE_NAME);

  // Ensure default settings exist
  const existing = await store.get<AppSettings>(SETTINGS_KEY);
  if (!existing) {
    await store.set(SETTINGS_KEY, DEFAULT_SETTINGS);
    await store.save();
  }

  return store;
}

/**
 * Get the store instance (must call initializeSettings first)
 */
export function getStore(): Store {
  if (!store) {
    throw new Error('Settings store not initialized. Call initializeSettings() first.');
  }
  return store;
}

/**
 * Get all app settings
 */
export async function getSettings(): Promise<AppSettings> {
  const s = getStore();
  const settings = await s.get<AppSettings>(SETTINGS_KEY);
  return settings || DEFAULT_SETTINGS;
}

/**
 * Update app settings (partial update)
 */
export async function updateSettings(
  updates: Partial<AppSettings>
): Promise<AppSettings> {
  const s = getStore();
  const current = await getSettings();
  const updated = { ...current, ...updates };

  await s.set(SETTINGS_KEY, updated);
  await s.save();

  return updated;
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<AppSettings> {
  const s = getStore();
  await s.set(SETTINGS_KEY, DEFAULT_SETTINGS);
  await s.save();
  return DEFAULT_SETTINGS;
}

// ============================================
// Individual Setting Helpers
// ============================================

export async function getVolume(): Promise<number> {
  const settings = await getSettings();
  return settings.volume;
}

export async function setVolume(volume: number): Promise<void> {
  await updateSettings({ volume: Math.max(0, Math.min(100, volume)) });
}

export async function getMuted(): Promise<boolean> {
  const settings = await getSettings();
  return settings.muted;
}

export async function setMuted(muted: boolean): Promise<void> {
  await updateSettings({ muted });
}

export async function getTheme(): Promise<AppSettings['theme']> {
  const settings = await getSettings();
  return settings.theme;
}

export async function setTheme(theme: AppSettings['theme']): Promise<void> {
  await updateSettings({ theme });
}

export async function getShuffle(): Promise<boolean> {
  const settings = await getSettings();
  return settings.shuffle;
}

export async function setShuffle(shuffle: boolean): Promise<void> {
  await updateSettings({ shuffle });
}

export async function getRepeat(): Promise<AppSettings['repeat']> {
  const settings = await getSettings();
  return settings.repeat;
}

export async function setRepeat(repeat: AppSettings['repeat']): Promise<void> {
  await updateSettings({ repeat });
}

export async function getMusicFolders(): Promise<string[]> {
  const settings = await getSettings();
  return settings.musicFolders;
}

export async function addMusicFolder(folder: string): Promise<void> {
  const settings = await getSettings();
  if (!settings.musicFolders.includes(folder)) {
    await updateSettings({
      musicFolders: [...settings.musicFolders, folder],
    });
  }
}

export async function removeMusicFolder(folder: string): Promise<void> {
  const settings = await getSettings();
  await updateSettings({
    musicFolders: settings.musicFolders.filter((f) => f !== folder),
  });
}

// ============================================
// Window State Helpers
// ============================================

export async function saveWindowState(
  width: number,
  height: number,
  maximized: boolean
): Promise<void> {
  await updateSettings({
    windowWidth: width,
    windowHeight: height,
    windowMaximized: maximized,
  });
}

export async function getWindowState(): Promise<{
  width: number;
  height: number;
  maximized: boolean;
}> {
  const settings = await getSettings();
  return {
    width: settings.windowWidth,
    height: settings.windowHeight,
    maximized: settings.windowMaximized,
  };
}
