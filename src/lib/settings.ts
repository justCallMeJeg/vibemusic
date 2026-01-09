/**
 * Settings Service for VibMusic
 * 
 * Provides persistent app settings using Tauri Store plugin.
 * Settings are stored in a JSON file in the app data directory.
 * 
 * Includes helpers for:
 * - Audio settings (volume, mute, crossfade)
 * - Playback settings (shuffle, repeat, gapless)
 * - UI settings (theme, sidebar width)
 * - Library settings (music folders)
 * - Window state persistence
 * 
 * @module settings
 */

import { Store } from '@tauri-apps/plugin-store';
import type { AppSettings } from '../types/database';
import { DEFAULT_SETTINGS } from '../types/database';

/** Store instance singleton */
let store: Store | null = null;

/** Settings file name (stored in app data directory) */
const STORE_NAME = 'settings.json';

/** Key for app settings in the store */
const SETTINGS_KEY = 'app_settings';

/**
 * Initialize the settings store.
 * 
 * This should be called once at app startup. Creates default settings
 * if none exist.
 * 
 * @returns The initialized Store instance
 * 
 * @example
 * ```typescript
 * await initializeSettings();
 * const settings = await getSettings();
 * ```
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
 * Get the store instance.
 * 
 * @returns The Store instance
 * @throws Error if store has not been initialized via `initializeSettings()`
 */
export function getStore(): Store {
  if (!store) {
    throw new Error('Settings store not initialized. Call initializeSettings() first.');
  }
  return store;
}

/**
 * Get all app settings.
 * 
 * @returns The current AppSettings object
 */
export async function getSettings(): Promise<AppSettings> {
  const s = getStore();
  const settings = await s.get<AppSettings>(SETTINGS_KEY);
  return settings || DEFAULT_SETTINGS;
}

/**
 * Update app settings with a partial update.
 * 
 * Only the provided fields are updated; other settings remain unchanged.
 * 
 * @param updates - Partial settings object with fields to update
 * @returns The complete updated AppSettings object
 * 
 * @example
 * ```typescript
 * await updateSettings({ volume: 50, muted: false });
 * ```
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
 * Reset all settings to default values.
 * 
 * @returns The default AppSettings object
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

/**
 * Get the current volume level.
 * @returns Volume level (0-100)
 */
export async function getVolume(): Promise<number> {
  const settings = await getSettings();
  return settings.volume;
}

/**
 * Set the volume level.
 * @param volume - Volume level (0-100, clamped to range)
 */
export async function setVolume(volume: number): Promise<void> {
  await updateSettings({ volume: Math.max(0, Math.min(100, volume)) });
}

/**
 * Get the muted state.
 * @returns True if audio is muted
 */
export async function getMuted(): Promise<boolean> {
  const settings = await getSettings();
  return settings.muted;
}

/**
 * Set the muted state.
 * @param muted - True to mute audio
 */
export async function setMuted(muted: boolean): Promise<void> {
  await updateSettings({ muted });
}

/**
 * Get the current theme.
 * @returns 'light', 'dark', or 'system'
 */
export async function getTheme(): Promise<AppSettings['theme']> {
  const settings = await getSettings();
  return settings.theme;
}

/**
 * Set the app theme.
 * @param theme - 'light', 'dark', or 'system'
 */
export async function setTheme(theme: AppSettings['theme']): Promise<void> {
  await updateSettings({ theme });
}

/**
 * Get the shuffle state.
 * @returns True if shuffle is enabled
 */
export async function getShuffle(): Promise<boolean> {
  const settings = await getSettings();
  return settings.shuffle;
}

/**
 * Set the shuffle state.
 * @param shuffle - True to enable shuffle
 */
export async function setShuffle(shuffle: boolean): Promise<void> {
  await updateSettings({ shuffle });
}

/**
 * Get the repeat mode.
 * @returns 'off', 'one', or 'all'
 */
export async function getRepeat(): Promise<AppSettings['repeat']> {
  const settings = await getSettings();
  return settings.repeat;
}

/**
 * Set the repeat mode.
 * @param repeat - 'off', 'one', or 'all'
 */
export async function setRepeat(repeat: AppSettings['repeat']): Promise<void> {
  await updateSettings({ repeat });
}

/**
 * Get the list of configured music folders.
 * @returns Array of folder paths
 */
export async function getMusicFolders(): Promise<string[]> {
  const settings = await getSettings();
  return settings.musicFolders;
}

/**
 * Add a music folder to the library.
 * 
 * Does nothing if the folder is already in the list.
 * 
 * @param folder - Absolute path to the folder
 */
export async function addMusicFolder(folder: string): Promise<void> {
  const settings = await getSettings();
  if (!settings.musicFolders.includes(folder)) {
    await updateSettings({
      musicFolders: [...settings.musicFolders, folder],
    });
  }
}

/**
 * Remove a music folder from the library.
 * 
 * @param folder - Absolute path to the folder
 */
export async function removeMusicFolder(folder: string): Promise<void> {
  const settings = await getSettings();
  await updateSettings({
    musicFolders: settings.musicFolders.filter((f) => f !== folder),
  });
}

// ============================================
// Window State Helpers
// ============================================

/**
 * Save the current window state for restoration on next launch.
 * 
 * @param width - Window width in pixels
 * @param height - Window height in pixels
 * @param maximized - Whether the window is maximized
 */
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

/**
 * Get the saved window state.
 * 
 * @returns Object with width, height, and maximized state
 */
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

